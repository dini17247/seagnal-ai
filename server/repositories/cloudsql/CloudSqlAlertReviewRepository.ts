import { AlertReview, AlertReviewRepository } from '../interfaces/AlertReviewRepository';

export class CloudSqlAlertReviewRepository implements AlertReviewRepository {
  private db: any;

  constructor(db?: any) {
    this.db = db;
  }

  async findById(alertId: string): Promise<AlertReview | null> {
    const sql = `SELECT * FROM alert_reviews WHERE alert_id = $1`;
    console.log(`[SQL Execute] [AlertReview.findById]: ${sql} with [${alertId}]`);
    return null;
  }

  async upsert(review: AlertReview): Promise<AlertReview> {
    const sql = `
      INSERT INTO alert_reviews (alert_id, assigned_user_id, reviewed_by_user_id, resolved_by_user_id, status, review_notes, resolution_notes, reviewed_at, resolved_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (alert_id) DO UPDATE 
      SET assigned_user_id = EXCLUDED.assigned_user_id,
          status = EXCLUDED.status,
          resolution_notes = EXCLUDED.resolution_notes,
          resolved_at = EXCLUDED.resolved_at
    `;
    console.log(`[SQL Execute]: ${sql}`);
    return review;
  }

  async listReviews(): Promise<AlertReview[]> {
    return [];
  }
}
