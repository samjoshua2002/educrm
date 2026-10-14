import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { MarketingCampaign } from './entities/marketing-campaign.entity.js';
import { Lead } from '../leads/entities/lead.entity.js';
import {
  CampaignQueryDto,
  CreateCampaignDto,
  PerformanceQueryDto,
  UpdateCampaignDto,
} from './dto/campaign.dto.js';

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(MarketingCampaign)
    private readonly repo: Repository<MarketingCampaign>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
  ) {}

  private campaignExpr(attribution: 'first' | 'last' = 'first') {
    return attribution === 'last' ? "(lead.last_touch->>'campaignId')" : 'lead.campaign_id::text';
  }

  private async countsFor(orgId: string, ids: string[], attribution: 'first' | 'last' = 'first') {
    if (ids.length === 0) return new Map<string, { leads: number; converted: number; hot: number }>();
    const expr = this.campaignExpr(attribution);
    const rows: { cid: string; leads: string; converted: string; hot: string }[] = await this.leadRepo
      .createQueryBuilder('lead')
      .select(`${expr}`, 'cid')
      .addSelect('COUNT(*)', 'leads')
      .addSelect("COUNT(*) FILTER (WHERE lead.status = 'converted')", 'converted')
      .addSelect("COUNT(*) FILTER (WHERE lead.score_band = 'hot')", 'hot')
      .where('lead.organization_id = :orgId', { orgId })
      .andWhere("lead.status != 'merged'")
      .andWhere(`${expr} IN (:...ids)`, { ids })
      .groupBy(expr)
      .getRawMany();
    return new Map(
      rows.map((r) => [r.cid, { leads: Number(r.leads), converted: Number(r.converted), hot: Number(r.hot) }]),
    );
  }

  private withMetrics(c: MarketingCampaign, m?: { leads: number; converted: number; hot: number }) {
    const leads = m?.leads ?? 0;
    const converted = m?.converted ?? 0;
    const cost = Number(c.cost || 0);
    return {
      ...c,
      cost,
      leadCount: leads,
      convertedCount: converted,
      hotCount: m?.hot ?? 0,
      costPerLead: leads ? round2(cost / leads) : null,
      costPerConversion: converted ? round2(cost / converted) : null,
      conversionRate: leads ? round2((converted / leads) * 100) : 0,
    };
  }

  async findAll(orgId: string, q: CampaignQueryDto) {
    const qb = this.repo.createQueryBuilder('c').where('c.organization_id = :orgId', { orgId });
    if (q.search) qb.andWhere('(c.name ILIKE :s OR c.utm_campaign ILIKE :s OR c.sub_source ILIKE :s)', { s: `%${q.search}%` });
    if (q.status) qb.andWhere('c.status = :status', { status: q.status });
    if (q.sourceType) qb.andWhere('c.source_type = :st', { st: q.sourceType });
    const [rows, total] = await qb
      .orderBy('c.created_at', 'DESC')
      .skip(q.skip)
      .take(q.limit)
      .getManyAndCount();
    const counts = await this.countsFor(orgId, rows.map((r) => r.id));
    return {
      data: rows.map((r) => this.withMetrics(r, counts.get(r.id))),
      total,
      page: q.page,
      limit: q.limit,
    };
  }

  async findOne(orgId: string, id: string) {
    const c = await this.repo.findOne({ where: { id, organizationId: orgId } });
    if (!c) throw new NotFoundException('Campaign not found');
    const counts = await this.countsFor(orgId, [id]);
    return this.withMetrics(c, counts.get(id));
  }

  private validateDates(dto: { startDate?: string | null; endDate?: string | null }) {
    if (dto.startDate && dto.endDate && dto.endDate < dto.startDate) {
      throw new BadRequestException('End date cannot be before the start date');
    }
  }

  async create(orgId: string, userId: string, dto: CreateCampaignDto) {
    this.validateDates(dto);
    await this.assertUniqueUtm(orgId, dto.utmCampaign);
    const c = await this.repo.save(
      this.repo.create({
        organizationId: orgId,
        name: dto.name.trim(),
        utmCampaign: dto.utmCampaign?.trim() || null,
        sourceType: dto.sourceType,
        subSource: dto.subSource?.trim() || null,
        startDate: dto.startDate || null,
        endDate: dto.endDate || null,
        cost: dto.cost ?? 0,
        currency: dto.currency || 'INR',
        status: dto.status || 'Active',
        description: dto.description ?? null,
        createdBy: userId,
      }),
    );
    const mapped = await this.backfill(orgId, c);
    return { ...(await this.findOne(orgId, c.id)), mappedLeads: mapped };
  }

  async update(orgId: string, id: string, dto: UpdateCampaignDto) {
    const c = await this.repo.findOne({ where: { id, organizationId: orgId } });
    if (!c) throw new NotFoundException('Campaign not found');
    if (dto.utmCampaign !== undefined && (dto.utmCampaign || null) !== c.utmCampaign) {
      await this.assertUniqueUtm(orgId, dto.utmCampaign, id);
    }
    Object.assign(c, {
      ...dto,
      utmCampaign: dto.utmCampaign !== undefined ? dto.utmCampaign?.trim() || null : c.utmCampaign,
    });
    this.validateDates(c);
    await this.repo.save(c);
    const mapped = await this.backfill(orgId, c);
    return { ...(await this.findOne(orgId, id)), mappedLeads: mapped };
  }

  async remove(orgId: string, id: string) {
    const c = await this.repo.findOne({ where: { id, organizationId: orgId } });
    if (!c) throw new NotFoundException('Campaign not found');
    // leads keep campaign_name / utm values; only the reference is cleared
    await this.leadRepo.update({ organizationId: orgId, campaignId: id }, { campaignId: null as any });
    await this.repo.remove(c);
    return { deleted: true };
  }

  private async assertUniqueUtm(orgId: string, utm?: string | null, exceptId?: string) {
    if (!utm?.trim()) return;
    const qb = this.repo
      .createQueryBuilder('c')
      .where('c.organization_id = :orgId', { orgId })
      .andWhere('LOWER(c.utm_campaign) = :u', { u: utm.trim().toLowerCase() });
    if (exceptId) qb.andWhere('c.id != :id', { id: exceptId });
    if (await qb.getCount()) {
      throw new BadRequestException(`Another campaign already uses utm_campaign "${utm}"`);
    }
  }

  /** Maps existing leads whose utm_campaign matches but were captured before the campaign existed. */
  private async backfill(orgId: string, c: MarketingCampaign): Promise<number> {
    if (!c.utmCampaign) return 0;
    const res = await this.leadRepo
      .createQueryBuilder()
      .update(Lead)
      .set({ campaignId: c.id, campaignName: c.name })
      .where('organization_id = :orgId', { orgId })
      .andWhere('campaign_id IS NULL')
      .andWhere('LOWER(utm_campaign) = :u', { u: c.utmCampaign.toLowerCase() })
      .execute();
    return res.affected ?? 0;
  }

  private applyRange(qb: SelectQueryBuilder<Lead>, q: PerformanceQueryDto) {
    if (q.from) qb.andWhere('lead.created_at >= :from', { from: q.from });
    if (q.to) qb.andWhere("lead.created_at < (CAST(:to AS date) + INTERVAL '1 day')", { to: q.to });
    return qb;
  }

  /** Channel performance & ROI (leads per channel / source type / campaign, cost per lead). */
  async performance(orgId: string, q: PerformanceQueryDto) {
    const attribution = q.attribution || 'first';
    const base = () =>
      this.applyRange(
        this.leadRepo
          .createQueryBuilder('lead')
          .where('lead.organization_id = :orgId', { orgId })
          .andWhere("lead.status != 'merged'"),
        q,
      );

    const group = async (expr: string) => {
      const rows: { k: string | null; leads: string; converted: string; hot: string; dup: string }[] = await base()
        .select(expr, 'k')
        .addSelect('COUNT(*)', 'leads')
        .addSelect("COUNT(*) FILTER (WHERE lead.status = 'converted')", 'converted')
        .addSelect("COUNT(*) FILTER (WHERE lead.score_band = 'hot')", 'hot')
        .addSelect('COALESCE(SUM(lead.duplicate_count), 0)', 'dup')
        .groupBy(expr)
        .orderBy('COUNT(*)', 'DESC')
        .getRawMany();
      return rows.map((r) => ({
        key: r.k || 'Unknown',
        leads: Number(r.leads),
        converted: Number(r.converted),
        hot: Number(r.hot),
        reentries: Number(r.dup),
        conversionRate: Number(r.leads) ? round2((Number(r.converted) / Number(r.leads)) * 100) : 0,
      }));
    };

    const channelExpr =
      attribution === 'last' ? "COALESCE(lead.last_touch->>'channelSource', lead.channel_source)" : 'lead.channel_source';
    const typeExpr =
      attribution === 'last' ? "COALESCE(lead.last_touch->>'sourceType', lead.source_type)" : 'lead.source_type';
    const subExpr =
      attribution === 'last' ? "COALESCE(lead.last_touch->>'subSource', lead.sub_source)" : 'lead.sub_source';

    const [byChannel, bySourceType, bySubSource] = await Promise.all([
      group(channelExpr),
      group(typeExpr),
      group(subExpr),
    ]);

    // campaigns: cost is attributed to the period by overlapping dates (whole cost when no dates)
    const campaigns = await this.repo.find({ where: { organizationId: orgId }, order: { createdAt: 'DESC' } });
    const cExpr = this.campaignExpr(attribution);
    const cRows: { cid: string; leads: string; converted: string; hot: string }[] = campaigns.length
      ? await base()
          .select(cExpr, 'cid')
          .addSelect('COUNT(*)', 'leads')
          .addSelect("COUNT(*) FILTER (WHERE lead.status = 'converted')", 'converted')
          .addSelect("COUNT(*) FILTER (WHERE lead.score_band = 'hot')", 'hot')
          .andWhere(`${cExpr} IS NOT NULL`)
          .groupBy(cExpr)
          .getRawMany()
      : [];
    const cMap = new Map(cRows.map((r) => [r.cid, r]));
    const byCampaign = campaigns.map((c) => {
      const r = cMap.get(c.id);
      return this.withMetrics(
        c,
        r ? { leads: Number(r.leads), converted: Number(r.converted), hot: Number(r.hot) } : undefined,
      );
    });

    // cost per source type from campaign spend
    const costByType = new Map<string, number>();
    for (const c of campaigns) costByType.set(c.sourceType, (costByType.get(c.sourceType) || 0) + Number(c.cost || 0));
    const bySourceTypeWithCost = bySourceType.map((r) => {
      const cost = costByType.get(r.key) || 0;
      return { ...r, cost, costPerLead: r.leads && cost ? round2(cost / r.leads) : null };
    });

    const totalLeads = byChannel.reduce((s, r) => s + r.leads, 0);
    const totalConverted = byChannel.reduce((s, r) => s + r.converted, 0);
    const totalCost = campaigns.reduce((s, c) => s + Number(c.cost || 0), 0);
    const campaignLeads = byCampaign.reduce((s, c) => s + c.leadCount, 0);

    return {
      attribution,
      totals: {
        leads: totalLeads,
        converted: totalConverted,
        conversionRate: totalLeads ? round2((totalConverted / totalLeads) * 100) : 0,
        campaignSpend: round2(totalCost),
        campaignLeads,
        costPerLead: campaignLeads ? round2(totalCost / campaignLeads) : null,
      },
      byChannel,
      bySourceType: bySourceTypeWithCost,
      bySubSource,
      byCampaign,
    };
  }
}
