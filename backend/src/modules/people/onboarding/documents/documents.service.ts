import { API_SUCCESS_MESSAGES } from "../../../../core/globals";
import type {
  CreateDocumentRequestDto,
  DocumentDto,
  DocumentResponseDto,
  ListDocumentsResponseDto,
  UpdateDocumentRequestDto,
} from "./dto";
import { DocumentsRepository } from "./documents.repository";

type DocumentRecord = Awaited<
  ReturnType<DocumentsRepository["findByIdOnDefaultTemplate"]>
>;

/**
 * Business logic for HR-managed required onboarding documents.
 */
export class DocumentsService {
  constructor(
    private readonly documentsRepository = new DocumentsRepository(),
  ) {}

  /**
   * Creates a new required document on the default onboarding template.
   */
  async createDocument(
    dto: CreateDocumentRequestDto,
  ): Promise<DocumentResponseDto> {
    const document = await this.documentsRepository.createOnDefaultTemplate(dto);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.DOCUMENT_CREATED,
      data: this.toDocumentDto(document),
    };
  }

  /**
   * Returns all required documents configured for onboarding.
   */
  async listDocuments(): Promise<ListDocumentsResponseDto> {
    const documents =
      await this.documentsRepository.findAllOnDefaultTemplate();

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.DOCUMENTS_RETRIEVED,
      data: documents.map((document) => this.toDocumentDto(document)),
    };
  }

  /**
   * Returns one required document by ID.
   */
  async getDocument(id: string): Promise<DocumentResponseDto> {
    const document = await this.documentsRepository.findByIdOnDefaultTemplate(id);

    if (!document) {
      throw new Error("Document not found");
    }

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.DOCUMENT_RETRIEVED,
      data: this.toDocumentDto(document),
    };
  }

  /**
   * Updates an existing required document.
   */
  async updateDocument(
    id: string,
    dto: UpdateDocumentRequestDto,
  ): Promise<DocumentResponseDto> {
    const existing = await this.documentsRepository.findByIdOnDefaultTemplate(id);

    if (!existing) {
      throw new Error("Document not found");
    }

    const document = await this.documentsRepository.updateOnDefaultTemplate(
      id,
      dto,
    );

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.DOCUMENT_UPDATED,
      data: this.toDocumentDto(document),
    };
  }

  /**
   * Removes a required document from the onboarding checklist.
   */
  async deleteDocument(id: string): Promise<DocumentResponseDto> {
    const existing = await this.documentsRepository.findByIdOnDefaultTemplate(id);

    if (!existing) {
      throw new Error("Document not found");
    }

    const document = await this.documentsRepository.deleteOnDefaultTemplate(id);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.DOCUMENT_DELETED,
      data: this.toDocumentDto(document),
    };
  }

  private toDocumentDto(document: NonNullable<DocumentRecord>): DocumentDto {
    return {
      id: document.id,
      documentName: document.documentName,
      instructions: document.instructions,
      allowedFileTypes: document.allowedFileTypes,
      isRequired: document.isRequired,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    };
  }
}
