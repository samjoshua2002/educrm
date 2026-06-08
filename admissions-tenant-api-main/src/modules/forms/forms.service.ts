import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Form, FormStatus } from './entities/form.entity.js';
import { FormTemplate } from './entities/form-template.entity.js';
import { FormResponse, ResponseStatus } from './entities/form-response.entity.js';
import { CreateFormDto } from './dto/create-form.dto.js';
import { UpdateFormDto } from './dto/update-form.dto.js';
import { SubmitFormDto } from './dto/submit-form.dto.js';
import { UpdateResponseStatusDto } from './dto/update-response-status.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { mergeDefaultFormFields } from './form-default-fields.js';

@Injectable()
export class FormsService {
  constructor(
    @InjectRepository(Form)
    private readonly formRepository: Repository<Form>,
    @InjectRepository(FormTemplate)
    private readonly templateRepository: Repository<FormTemplate>,
    @InjectRepository(FormResponse)
    private readonly responseRepository: Repository<FormResponse>,
  ) {}

  async create(orgId: string, dto: CreateFormDto, userId: string): Promise<Form> {
    const slug = dto.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + '-' + Date.now().toString().slice(-4);
    const form = this.formRepository.create({
      ...dto,
      slug,
      organizationId: orgId,
      createdBy: userId,
      fields: mergeDefaultFormFields([]),
    });
    return this.formRepository.save(form);
  }

  async findAllByOrg(orgId: string, paginationDto: PaginationDto, search?: string, status?: FormStatus) {
    const query = this.formRepository.createQueryBuilder('form')
      .where('form.organization_id = :orgId', { orgId });

    if (search) {
      query.andWhere('form.name ILIKE :search', { search: `%${search}%` });
    }

    if (status) {
      query.andWhere('form.status = :status', { status });
    }

    const [data, total] = await query
      .skip(paginationDto.skip)
      .take(paginationDto.limit)
      .orderBy('form.createdAt', 'DESC')
      .getManyAndCount();

    const totalPages = Math.ceil(total / paginationDto.limit);
    return { data, total, totalPages, page: paginationDto.page, limit: paginationDto.limit };
  }

  async findOne(id: string, orgId: string): Promise<Form> {
    const form = await this.formRepository.findOne({
      where: { id, organizationId: orgId },
    });
    if (!form) {
      throw new NotFoundException(`Form with ID ${id} not found`);
    }
    form.fields = mergeDefaultFormFields(form.fields);
    return form;
  }

  async findBySlug(slug: string): Promise<Form> {
    const form = await this.formRepository.findOne({
      where: { slug, status: FormStatus.ACTIVE },
      relations: ['organization', 'organization.branches'],
    });
    if (!form) {
      throw new NotFoundException(`Form with slug ${slug} not found or not active`);
    }
    form.fields = mergeDefaultFormFields(form.fields);
    return form;
  }

  async update(id: string, orgId: string, dto: UpdateFormDto): Promise<Form> {
    const form = await this.findOne(id, orgId);
    if (dto.fields) {
      dto.fields = mergeDefaultFormFields(dto.fields);
    }
    Object.assign(form, dto);
    return this.formRepository.save(form);
  }

  async remove(id: string, orgId: string): Promise<void> {
    const form = await this.findOne(id, orgId);
    await this.formRepository.remove(form);
  }

  async duplicate(id: string, orgId: string, userId: string): Promise<Form> {
    const originalForm = await this.findOne(id, orgId);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, createdAt, updatedAt, responses, ...rest } = originalForm;
    const duplicatedForm = this.formRepository.create({
      ...rest,
      name: `${originalForm.name} (Copy)`,
      status: FormStatus.DRAFT,
      createdBy: userId,
      fields: mergeDefaultFormFields(originalForm.fields),
    });
    return this.formRepository.save(duplicatedForm);
  }

  async findAllTemplates() {
    return this.templateRepository.find({ where: { isActive: true } });
  }

  async submitResponse(formId: string, dto: SubmitFormDto): Promise<FormResponse> {
    const form = await this.formRepository.findOne({ where: { id: formId } });
    if (!form) {
      throw new NotFoundException(`Form with ID ${formId} not found`);
    }

    if (form.status !== FormStatus.ACTIVE) {
      throw new BadRequestException('Form is not active and cannot accept submissions');
    }

    // Extract email case-insensitively from data
    const emailKey = Object.keys(dto.data).find((k) => k.toLowerCase() === 'email');
    const email = emailKey ? dto.data[emailKey] : null;
    let isDuplicate = false;

    if (email) {
      const existingResponse = await this.responseRepository.createQueryBuilder('response')
        .where('response.form_id = :formId', { formId })
        .andWhere("LOWER(response.data->>'email') = :email OR LOWER(response.data->>'Email') = :email", { email: email.toLowerCase() })
        .getOne();

      if (existingResponse) {
        isDuplicate = true;
      }
    }

    const response = this.responseRepository.create({
      formId,
      organizationId: form.organizationId,
      data: dto.data,
      isDuplicate,
    });

    return this.responseRepository.save(response);
  }

  async findResponsesByForm(formId: string, orgId: string, paginationDto: PaginationDto, search?: string, status?: ResponseStatus) {
    const query = this.responseRepository.createQueryBuilder('response')
      .where('response.form_id = :formId', { formId })
      .andWhere('response.organization_id = :orgId', { orgId });

    if (search) {
      query.andWhere("response.data::text ILIKE :search", { search: `%${search}%` });
    }

    if (status) {
      query.andWhere('response.status = :status', { status });
    }

    const [data, total] = await query
      .skip(paginationDto.skip)
      .take(paginationDto.limit)
      .orderBy('response.submittedAt', 'DESC')
      .getManyAndCount();

    const totalPages = Math.ceil(total / paginationDto.limit);
    return { data, total, totalPages, page: paginationDto.page, limit: paginationDto.limit };
  }

  async updateResponseStatus(id: string, dto: UpdateResponseStatusDto): Promise<FormResponse> {
    const response = await this.responseRepository.findOne({ where: { id } });
    if (!response) {
      throw new NotFoundException(`Response with ID ${id} not found`);
    }
    response.status = dto.status;
    return this.responseRepository.save(response);
  }
}
