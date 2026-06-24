import { Alert } from '../../../src/types';

export interface AlertReview {
  alert_id: string;
  assigned_user_id?: string;
  assigned_user_name?: string;
  reviewed_by_user_id?: string;
  resolved_by_user_id?: string;
  status: 'Active' | 'Under Review' | 'Resolved';
  review_notes?: string;
  resolution_notes?: string;
  reviewed_at?: string;
  resolved_at?: string;
  reviewed_by?: string;
}

export interface AlertReviewRepository {
  findById(alertId: string): Promise<AlertReview | null>;
  upsert(review: AlertReview): Promise<AlertReview>;
  listReviews(): Promise<AlertReview[]>;
}
