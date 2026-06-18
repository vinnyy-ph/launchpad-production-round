export interface TeamEmployee {
  id: string;
  fullName: string;
  companyEmail: string;
  jobTitle: string | null;
}

export interface Team {
  id: string;
  name: string;
  leader: TeamEmployee;
  members: TeamEmployee[];
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamFilters {
  page?: number;
  limit?: number;
}

export interface TeamListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
