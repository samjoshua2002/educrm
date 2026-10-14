import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GdScoringScheme, GdSchemeComponent } from './entities/gd-scoring-scheme.entity.js';
import { CandidateComponentScore } from './entities/candidate-component-score.entity.js';
import { ScoreConversionConfigService } from './score-conversion-config.service.js';
import { Application } from '../applications/entities/application.entity.js';
import { SaveGdSchemeDto, SaveComponentScoresDto } from './dto/gd-scoring-scheme.dto.js';

export const STANDARD_SCHEME_ID = 'standard';

// The predefined template = the scoring setup the product shipped with:
// GD out of 10 and PI out of 30, each added to the composite as-is
// (composite = academics + entrance + experience + GD + PI + achievement -
// penalty, capped at 100). It is always available and is the default.
export const STANDARD_SCHEME = {
  id: STANDARD_SCHEME_ID,
  name: 'Standard (GD /10 + PI /30)',
  description:
    'Predefined template: Group Discussion out of 10 and Personal Interview out of 30, added directly to the composite score.',
  isPredefined: true,
  components: [
    {
      key: 'gd',
      label: 'Group Discussion',
      interviewType: 'GD',
      maxMarks: 10,
      compositeWeight: 10,
      includeInComposite: true,
      parameters: [],
    },
    {
      key: 'pi',
      label: 'Personal Interview',
      interviewType: 'PI',
      maxMarks: 30,
      compositeWeight: 30,
      includeInComposite: true,
      parameters: [],
    },
  ] as GdSchemeComponent[],
};

export interface ResolvedScheme {
  id: string;
  name: string;
  description: string | null;
  isPredefined: boolean;
  components: GdSchemeComponent[];
}

function slug(value: string, fallback: string): string {
  const s = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  return s || fallback;
}

@Injectable()
export class GdScoringSchemesService {
  constructor(
    @InjectRepository(GdScoringScheme)
    private readonly schemeRepository: Repository<GdScoringScheme>,
    @InjectRepository(CandidateComponentScore)
    private readonly componentScoreRepository: Repository<CandidateComponentScore>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    private readonly configService: ScoreConversionConfigService,
  ) {}

  private toResolved(scheme: GdScoringScheme): ResolvedScheme {
    return {
      id: scheme.id,
      name: scheme.name,
      description: scheme.description ?? null,
      isPredefined: false,
      components: scheme.components ?? [],
    };
  }

  // Normalises and validates the admin's components: unique keys, positive
  // maxima, and parameter maxima adding up to the component maximum.
  private normaliseComponents(components: SaveGdSchemeDto['components']): GdSchemeComponent[] {
    if (!components || components.length === 0) {
      throw new BadRequestException('A scoring scheme needs at least one component.');
    }
    const usedKeys = new Set<string>();
    return components.map((c, idx) => {
      let key = slug(c.key || c.label, `component_${idx + 1}`);
      while (usedKeys.has(key)) key = `${key}_${idx + 1}`;
      usedKeys.add(key);

      const paramKeys = new Set<string>();
      const parameters = (c.parameters ?? []).map((p, pIdx) => {
        let pKey = slug(p.key || p.name, `param_${pIdx + 1}`);
        while (paramKeys.has(pKey)) pKey = `${pKey}_${pIdx + 1}`;
        paramKeys.add(pKey);
        const maxMarks = Number(p.maxMarks);
        if (!(maxMarks > 0)) throw new BadRequestException(`Parameter "${p.name}" needs max marks above 0.`);
        return { key: pKey, name: p.name.trim(), maxMarks };
      });

      const paramTotal = parameters.reduce((sum, p) => sum + p.maxMarks, 0);
      const maxMarks = parameters.length > 0 ? paramTotal : Number(c.maxMarks);
      if (!(maxMarks > 0)) throw new BadRequestException(`Component "${c.label}" needs max marks above 0.`);
      const compositeWeight = c.compositeWeight !== undefined && c.compositeWeight !== null ? Number(c.compositeWeight) : maxMarks;
      if (!(compositeWeight >= 0)) throw new BadRequestException(`Component "${c.label}" has an invalid weightage.`);

      return {
        key,
        label: c.label.trim(),
        interviewType: c.interviewType === 'GD' || c.interviewType === 'PI' ? c.interviewType : null,
        maxMarks,
        compositeWeight,
        includeInComposite: c.includeInComposite !== false,
        parameters,
      };
    });
  }

  async list(orgId: string) {
    const config = await this.configService.getOrCreate(orgId);
    const custom = await this.schemeRepository.find({ where: { organizationId: orgId }, order: { createdAt: 'ASC' } });
    const selectedId = config.gdScoringSchemeId && custom.some((s) => s.id === config.gdScoringSchemeId)
      ? config.gdScoringSchemeId
      : STANDARD_SCHEME_ID;
    return {
      selectedSchemeId: selectedId,
      schemes: [STANDARD_SCHEME, ...custom.map((s) => this.toResolved(s))].map((s) => ({
        ...s,
        isSelected: s.id === selectedId,
      })),
    };
  }

  // The scheme every scoring calculation and evaluation screen uses.
  async getActiveScheme(orgId: string): Promise<ResolvedScheme> {
    const config = await this.configService.getOrCreate(orgId);
    if (config.gdScoringSchemeId) {
      const scheme = await this.schemeRepository.findOne({
        where: { id: config.gdScoringSchemeId, organizationId: orgId },
      });
      if (scheme) return this.toResolved(scheme);
    }
    return STANDARD_SCHEME;
  }

  async create(orgId: string, dto: SaveGdSchemeDto, actorId: string) {
    const scheme = this.schemeRepository.create({
      organizationId: orgId,
      name: dto.name.trim(),
      description: dto.description ?? null,
      components: this.normaliseComponents(dto.components),
      createdBy: actorId,
      updatedBy: actorId,
    });
    const saved = await this.schemeRepository.save(scheme);
    if (dto.select) await this.select(orgId, saved.id, actorId);
    return this.toResolved(saved);
  }

  async update(orgId: string, id: string, dto: SaveGdSchemeDto, actorId: string) {
    if (id === STANDARD_SCHEME_ID) {
      throw new BadRequestException('The predefined Standard template cannot be edited. Create a custom scheme instead.');
    }
    const scheme = await this.schemeRepository.findOne({ where: { id, organizationId: orgId } });
    if (!scheme) throw new NotFoundException(`Scoring scheme #${id} not found`);
    scheme.name = dto.name.trim();
    scheme.description = dto.description ?? null;
    scheme.components = this.normaliseComponents(dto.components);
    scheme.updatedBy = actorId;
    const saved = await this.schemeRepository.save(scheme);
    if (dto.select) await this.select(orgId, saved.id, actorId);
    return this.toResolved(saved);
  }

  async remove(orgId: string, id: string, actorId: string) {
    if (id === STANDARD_SCHEME_ID) throw new BadRequestException('The predefined Standard template cannot be deleted.');
    const scheme = await this.schemeRepository.findOne({ where: { id, organizationId: orgId } });
    if (!scheme) throw new NotFoundException(`Scoring scheme #${id} not found`);
    const config = await this.configService.getOrCreate(orgId);
    if (config.gdScoringSchemeId === id) {
      // Deleting the selected scheme falls back to the Standard template.
      await this.configService.setGdScoringScheme(orgId, null, actorId);
    }
    await this.schemeRepository.remove(scheme);
    await this.componentScoreRepository.delete({ organizationId: orgId, schemeId: id });
    return { success: true };
  }

  // Selecting 'standard' re-selects the predefined template.
  async select(orgId: string, id: string, actorId: string) {
    if (id !== STANDARD_SCHEME_ID) {
      const exists = await this.schemeRepository.findOne({ where: { id, organizationId: orgId } });
      if (!exists) throw new NotFoundException(`Scoring scheme #${id} not found`);
    }
    await this.configService.setGdScoringScheme(orgId, id === STANDARD_SCHEME_ID ? null : id, actorId);
    return this.list(orgId);
  }

  async findApplication(orgId: string, applicationNo: string) {
    const application = await this.applicationRepository.findOne({ where: { applicationNo, organizationId: orgId } });
    if (!application) throw new NotFoundException(`Application ${applicationNo} not found`);
    return application;
  }

  async getComponentScores(orgId: string, applicationId: string, schemeId: string) {
    return this.componentScoreRepository.find({ where: { organizationId: orgId, applicationId, schemeId } });
  }

  // Saves the marks entered on the candidate page for the ACTIVE scheme.
  async saveComponentScores(orgId: string, applicationNo: string, dto: SaveComponentScoresDto, actorId: string) {
    const application = await this.findApplication(orgId, applicationNo);
    const scheme = await this.getActiveScheme(orgId);
    const componentByKey = new Map(scheme.components.map((c) => [c.key, c]));

    for (const item of dto.components) {
      const component = componentByKey.get(item.componentKey);
      if (!component) throw new BadRequestException(`"${item.componentKey}" is not part of the selected scoring scheme.`);

      let rawScore: number | null = null;
      let parameterScores: Record<string, number> | null = null;
      if (component.parameters.length > 0 && item.parameterScores) {
        parameterScores = {};
        for (const p of component.parameters) {
          const v = item.parameterScores[p.key];
          if (v === undefined || v === null || (v as any) === '') continue;
          const n = Number(v);
          if (!Number.isFinite(n) || n < 0 || n > p.maxMarks) {
            throw new BadRequestException(`"${p.name}" must be between 0 and ${p.maxMarks}.`);
          }
          parameterScores[p.key] = n;
        }
        const values = Object.values(parameterScores);
        rawScore = values.length > 0 ? values.reduce((a, b) => a + b, 0) : null;
      } else if (item.rawScore !== undefined && item.rawScore !== null) {
        const n = Number(item.rawScore);
        if (!Number.isFinite(n) || n < 0 || n > component.maxMarks) {
          throw new BadRequestException(`${component.label} must be between 0 and ${component.maxMarks}.`);
        }
        rawScore = n;
      }

      let row = await this.componentScoreRepository.findOne({
        where: { applicationId: application.id, schemeId: scheme.id, componentKey: component.key },
      });
      if (!row) {
        row = this.componentScoreRepository.create({
          organizationId: orgId,
          applicationId: application.id,
          schemeId: scheme.id,
          componentKey: component.key,
        });
      }
      row.rawScore = rawScore;
      row.parameterScores = parameterScores;
      if (item.remarks !== undefined) row.remarks = item.remarks;
      row.updatedBy = actorId;
      await this.componentScoreRepository.save(row);

      // Standard template: keep the legacy Application GD/PI columns in step
      // so older screens (results list, student portal) keep showing them.
      if (scheme.id === STANDARD_SCHEME_ID && (component.key === 'gd' || component.key === 'pi')) {
        await this.applicationRepository.update(
          { id: application.id, organizationId: orgId },
          component.key === 'gd' ? { gdScore: rawScore as any } : { piScore: rawScore as any },
        );
      }
    }
    return application;
  }
}
