export type AccessLevel = 'PUBLIC' | 'INSTITUTIONAL' | 'EMBARGOED' | 'PRIVATE';
export type StorageBackend = 'GIT_LFS' | 'DVC_S3' | 'IPFS_CID';

export interface DataPointer {
  path: string;
  storageBackend: StorageBackend;
  contentHash: string; // SHA-256 or IPFS CID
  sizeBytes: number;
  mimeType: string;
}

export interface ProjectMetadata {
  doi?: string;
  title: string;
  authors: { name: string; orcid?: string; affiliation: string }[];
  license: string;
  keywords: string[];
  reproducibleEnvironment: {
    containerImage: string;
    cudaVersion?: string;
    entrypoint: string;
  };
}

export interface ScientificRepository {
  id: string;
  name: string;
  ownerId: string;
  accessLevel: AccessLevel;
  gitCommitHash: string;
  dataPointers: DataPointer[];
  metadata: ProjectMetadata;
  createdAt: string;
}
