import { AlertReview, AlertReviewRepository } from '../interfaces/AlertReviewRepository';

export class MemoryAlertReviewRepository implements AlertReviewRepository {
  private reviews: Map<string, AlertReview> = new Map();

  async findById(alertId: string): Promise<AlertReview | null> {
    const r = this.reviews.get(alertId);
    return r ? { ...r } : null;
  }

  async upsert(review: AlertReview): Promise<AlertReview> {
    this.reviews.set(review.alert_id, { ...review });
    return { ...review };
  }

  async listReviews(): Promise<AlertReview[]> {
    return Array.from(this.reviews.values()).map(r => ({ ...r }));
  }
}
