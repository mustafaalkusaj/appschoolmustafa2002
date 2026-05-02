import { cache } from './cache';
import { createRouteSupabaseClient } from './authorized-api';

export async function getCachedStudents(
  schoolId: string,
  branchId?: string,
  page = 1,
  limit = 50
) {
  const cacheKey = `students:${schoolId}:${branchId || 'all'}:${page}:${limit}`;

  // Try cache first
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  // If not cached, query database
  const supabase = await createRouteSupabaseClient();
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('students')
    .select('id, name, email, total_fee, paid_fee, remaining_fee', { count: 'exact' })
    .eq('school_id', schoolId)
    .eq('branch_id', branchId)
    .range(offset, offset + limit - 1);

  const result = { data, count, error };

  // Cache for 5 minutes
  if (data) {
    await cache.set(cacheKey, result, 300);
  }

  return result;
}

export async function getCachedPayments(
  schoolId: string,
  branchId?: string,
  page = 1,
  limit = 50
) {
  const cacheKey = `payments:${schoolId}:${branchId || 'all'}:${page}`;

  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const supabase = await createRouteSupabaseClient();
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('payments')
    .select('id, student_id, amount, payment_date, school_id, branch_id, status', { count: 'exact' })
    .eq('school_id', schoolId)
    .eq('branch_id', branchId)
    .range(offset, offset + limit - 1);

  const result = { data, count, error };

  if (data) {
    await cache.set(cacheKey, result, 300); // 5 min cache
  }

  return result;
}

export async function invalidateSchoolCache(schoolId: string) {
  await cache.invalidate(`*:${schoolId}:*`);
}
