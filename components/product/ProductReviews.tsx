"use client";

import { useCallback, useEffect, useState } from "react";

type ReviewItem = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
};

type ProductReviewsProps = {
  productId: string;
  canReview: boolean;
};

export default function ProductReviews({ productId, canReview }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [count, setCount] = useState(0);
  const [rating, setRating] = useState("5");
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    const res = await fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`);
    const data = await res.json();
    if (res.ok) {
      setReviews(data.reviews || []);
      setAverageRating(Number(data.averageRating || 0));
      setCount(Number(data.count || 0));
    }
  }, [productId]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          rating: Number(rating),
          title: title || undefined,
          comment: comment || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit review");
      } else {
        setMessage("Review submitted successfully.");
        setTitle("");
        setComment("");
        await loadReviews();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="soft-card mt-8 rounded-2xl p-5 sm:p-6">
      <div className="mb-5">
        <h3 className="text-xl font-black text-[var(--foreground)]">Customer Reviews</h3>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Average {averageRating.toFixed(1)} / 5 from {count} review(s)</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[360px_1fr]">
        <div>
          {canReview ? (
            <form onSubmit={submitReview} className="glass space-y-3 rounded-xl p-4">
              <h4 className="text-sm font-black uppercase tracking-wide text-[var(--foreground)]">Write a review</h4>
              <select className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" value={rating} onChange={(e) => setRating(e.target.value)}>
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Good</option>
                <option value="3">3 - Average</option>
                <option value="2">2 - Poor</option>
                <option value="1">1 - Very poor</option>
              </select>
              <input className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <textarea className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" rows={4} placeholder="Comment" value={comment} onChange={(e) => setComment(e.target.value)} />
              <button disabled={loading} className="btn-primary rounded-full px-4 py-2 text-xs font-bold disabled:opacity-60">
                {loading ? "Submitting..." : "Submit Review"}
              </button>
              {message ? <p className="text-sm text-green-700">{message}</p> : null}
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </form>
          ) : (
            <div className="glass rounded-xl p-4 text-sm text-[var(--muted-foreground)]">
              Only customers who purchased this product can leave a verified review.
            </div>
          )}
        </div>

        <div className="space-y-3">
          {reviews.length === 0 ? (
            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-4 text-sm text-[var(--muted-foreground)]">No reviews yet.</div>
          ) : (
            reviews.map((review) => (
              <article key={review.id} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-4">
                <p className="text-sm font-black text-[var(--foreground)]">{review.title || "Review"} | {review.rating}/5</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">{review.comment || "No comment"}</p>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">{review.user.name || review.user.email} | {new Date(review.createdAt).toLocaleString()}</p>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

