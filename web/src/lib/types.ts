export type JobStatus =
  | "draft"
  | "queued"
  | "preparing"
  | "processing"
  | "uploading"
  | "completed"
  | "failed";

export interface JobConfig {
  input_is_linear: boolean;
  despill_strength: number; // 0.0 – 1.0
  auto_despeckle: boolean;
  despeckle_size: number;
  refiner_scale: number;
}

export interface Job {
  id: string;
  user_id: string;
  name: string;
  status: JobStatus;
  config: JobConfig;
  input_storage_path: string | null;
  alpha_storage_path: string | null;
  total_frames: number | null;
  processed_frames: number;
  error_message: string | null;
  worker_id: string | null;
  claimed_at: string | null;
  last_heartbeat: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface JobFile {
  id: string;
  job_id: string;
  file_type: "input" | "alpha" | "matte" | "fg" | "processed" | "comp";
  storage_path: string;
  file_name: string;
  frame_number: number | null;
  created_at: string;
}

export const DEFAULT_JOB_CONFIG: JobConfig = {
  input_is_linear: false,
  despill_strength: 0.5,
  auto_despeckle: true,
  despeckle_size: 400,
  refiner_scale: 1.0,
};
