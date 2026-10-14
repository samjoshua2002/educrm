import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingCampaign } from '../campaigns/entities/marketing-campaign.entity.js';
import { CapturedLeadInput } from './lead-field-mapper.js';
import { CHANNEL_SOURCES, SOURCE_TYPES, TouchPoint } from './entities/lead.entity.js';

const PAID_MEDIUMS = ['cpc', 'ppc', 'paid', 'paidsearch', 'paid_search', 'paidsocial', 'paid_social', 'display', 'cpm', 'cpa', 'ads', 'ad', 'banner', 'retargeting', 'sem'];
const SOCIAL_HOSTS: Record<string, string> = {
  'facebook.com': 'Facebook',
  'fb.com': 'Facebook',
  'm.facebook.com': 'Facebook',
  'l.facebook.com': 'Facebook',
  'instagram.com': 'Instagram',
  'l.instagram.com': 'Instagram',
  'linkedin.com': 'LinkedIn',
  'lnkd.in': 'LinkedIn',
  't.co': 'X (Twitter)',
  'twitter.com': 'X (Twitter)',
  'x.com': 'X (Twitter)',
  'youtube.com': 'YouTube',
};
const SEARCH_HOSTS: Record<string, string> = {
  'google.': 'Google',
  'bing.com': 'Bing',
  'yahoo.': 'Yahoo',
  'duckduckgo.com': 'DuckDuckGo',
};
const KNOWN_SOURCES: Record<string, string> = {
  google: 'Google',
  googleads: 'Google',
  adwords: 'Google',
  facebook: 'Facebook',
  fb: 'Facebook',
  meta: 'Facebook',
  instagram: 'Instagram',
  ig: 'Instagram',
  linkedin: 'LinkedIn',
  twitter: 'X (Twitter)',
  x: 'X (Twitter)',
  youtube: 'YouTube',
  bing: 'Bing',
  shiksha: 'Shiksha',
  collegedunia: 'CollegeDunia',
  careers360: 'Careers360',
  whatsapp: 'WhatsApp',
  email: 'Email',
  newsletter: 'Email',
};

export interface SourceContext {
  /** Web, API, Import, Chatbot, Social, Portal, Event, Manual */
  createdFrom: string;
  /** Default channel when the payload does not say */
  channelSource?: string | null;
}

@Injectable()
export class LeadSourceTrackingService {
  constructor(
    @InjectRepository(MarketingCampaign)
    private readonly campaignRepo: Repository<MarketingCampaign>,
  ) {}

  /** Pulls utm_* / gclid / fbclid from the submission URL query string when not given explicitly. */
  private extractFromUrl(input: CapturedLeadInput) {
    if (!input.submissionUrl) return;
    try {
      const url = new URL(input.submissionUrl);
      const q = url.searchParams;
      input.utmSource ||= q.get('utm_source');
      input.utmMedium ||= q.get('utm_medium');
      input.utmCampaign ||= q.get('utm_campaign');
      input.utmTerm ||= q.get('utm_term');
      input.utmContent ||= q.get('utm_content');
      input.gclid ||= q.get('gclid');
      input.fbclid ||= q.get('fbclid');
    } catch {
      /* not a URL */
    }
  }

  private hostOf(url?: string | null): string | null {
    if (!url) return null;
    try {
      return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return null;
    }
  }

  private canonicalChannel(v?: string | null): string | null {
    if (!v) return null;
    const hit = CHANNEL_SOURCES.find((c) => c.toLowerCase() === v.toLowerCase());
    return hit ?? null;
  }

  private canonicalSourceType(v?: string | null): string | null {
    if (!v) return null;
    const norm = v.toLowerCase().replace(/[^a-z]/g, '');
    const hit = SOURCE_TYPES.find((c) => c.toLowerCase().replace(/[^a-z]/g, '') === norm);
    return hit ?? null;
  }

  /**
   * Appends source tracking data to the captured input (in place):
   * channel source, source type, sub-source, campaign mapping, legacy `source`.
   */
  async apply(orgId: string, input: CapturedLeadInput, ctx: SourceContext): Promise<CapturedLeadInput> {
    this.extractFromUrl(input);

    const medium = (input.utmMedium || '').toLowerCase().replace(/[\s-]/g, '_');
    const utmSrc = (input.utmSource || '').toLowerCase().replace(/[\s_-]/g, '');
    const refHost = this.hostOf(input.referrerUrl);

    // channel source
    input.channelSource =
      this.canonicalChannel(input.channelSource) ||
      this.canonicalChannel(ctx.channelSource) ||
      (ctx.createdFrom === 'Chatbot'
        ? 'Chatbot'
        : ctx.createdFrom === 'Portal'
          ? 'Portal'
          : ctx.createdFrom === 'Event'
            ? 'Event'
            : ctx.createdFrom === 'Social'
              ? 'Social'
              : 'Web');

    // sub-source (specific platform)
    if (!input.subSource) {
      if (utmSrc && KNOWN_SOURCES[utmSrc]) input.subSource = KNOWN_SOURCES[utmSrc];
      else if (input.utmSource) input.subSource = input.utmSource;
      else if (input.gclid) input.subSource = 'Google';
      else if (input.fbclid) input.subSource = 'Facebook';
      else if (refHost) {
        const social = Object.entries(SOCIAL_HOSTS).find(([h]) => refHost === h || refHost.endsWith('.' + h));
        const search = Object.entries(SEARCH_HOSTS).find(([h]) => refHost.includes(h));
        input.subSource = social?.[1] ?? search?.[1] ?? refHost;
      }
    }

    // campaign mapping (by explicit id, else utm_campaign against MarketingCampaign.utmCampaign / name)
    let campaign: MarketingCampaign | null = null;
    if (input.campaignId) {
      campaign = await this.campaignRepo.findOne({ where: { id: input.campaignId, organizationId: orgId } });
    }
    if (!campaign && (input.utmCampaign || input.campaignName)) {
      const key = (input.utmCampaign || input.campaignName || '').trim().toLowerCase();
      campaign = await this.campaignRepo
        .createQueryBuilder('c')
        .where('c.organization_id = :orgId', { orgId })
        .andWhere('(LOWER(c.utm_campaign) = :key OR LOWER(c.name) = :key)', { key })
        .orderBy('c.created_at', 'DESC')
        .getOne();
    }
    if (campaign) {
      input.campaignId = campaign.id;
      input.campaignName ||= campaign.name;
      input.subSource ||= campaign.subSource;
      input.sourceType ||= campaign.sourceType;
    } else {
      input.campaignId = null;
      input.campaignName ||= input.utmCampaign || null;
    }

    // source type
    let sourceType = this.canonicalSourceType(input.sourceType);
    if (!sourceType) {
      if (input.channelSource === 'Event') sourceType = 'Event';
      else if (input.channelSource === 'Portal') sourceType = 'Portal';
      else if (PAID_MEDIUMS.includes(medium) || input.gclid || input.fbclid) sourceType = 'Paid Ads';
      else if (ctx.createdFrom === 'Social') sourceType = 'Paid Ads'; // Facebook / LinkedIn Lead Ads are paid placements
      else if (medium === 'referral' || utmSrc === 'referral' || medium === 'affiliate') sourceType = 'Referral';
      else if (refHost && !Object.keys(SEARCH_HOSTS).some((h) => refHost.includes(h)) && !medium) sourceType = 'Referral';
      else sourceType = 'Organic';
    }
    input.sourceType = sourceType;

    // legacy free-text `source` used by existing list filters / icons
    input.source ||= input.subSource || input.channelSource;
    return input;
  }

  touchPoint(input: CapturedLeadInput, createdFrom: string): TouchPoint {
    return {
      at: new Date().toISOString(),
      channelSource: input.channelSource ?? null,
      sourceType: input.sourceType ?? null,
      subSource: input.subSource ?? null,
      utmSource: input.utmSource ?? null,
      utmMedium: input.utmMedium ?? null,
      utmCampaign: input.utmCampaign ?? null,
      utmTerm: input.utmTerm ?? null,
      utmContent: input.utmContent ?? null,
      campaignId: input.campaignId ?? null,
      campaignName: input.campaignName ?? null,
      formName: input.formName ?? null,
      submissionUrl: input.submissionUrl ?? null,
      referrerUrl: input.referrerUrl ?? null,
      createdFrom,
    };
  }
}
