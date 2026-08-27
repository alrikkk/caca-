import { StudentProfile } from "./user";
import { Project } from "./project";

export interface Clip {
  id: string;
  creatorId: string;
  creator?: StudentProfile;
  projectId?: string;
  project?: Project;
  videoUrl: string;
  thumbnailUrl?: string;
  caption: string;
  tags: string[];
  likesCount: number;
  isLiked?: boolean;
  createdAt: string;
}

export interface ClipLike {
  clipId: string;
  userId: string;
  createdAt: string;
}
