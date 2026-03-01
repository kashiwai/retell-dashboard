/**
 * 日本時間（JST）で日時をフォーマット
 */
export function formatDateTimeJST(timestamp: number | string | Date): string {
  const date = typeof timestamp === 'number' || typeof timestamp === 'string' 
    ? new Date(timestamp) 
    : timestamp;
    
  return date.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * 日本時間（JST）で時刻のみフォーマット
 */
export function formatTimeJST(timestamp: number | string | Date): string {
  const date = typeof timestamp === 'number' || typeof timestamp === 'string' 
    ? new Date(timestamp) 
    : timestamp;
    
  return date.toLocaleTimeString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * 日本時間（JST）で日付のみフォーマット
 */
export function formatDateJST(timestamp: number | string | Date): string {
  const date = typeof timestamp === 'number' || typeof timestamp === 'string' 
    ? new Date(timestamp) 
    : timestamp;
    
  return date.toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
}

/**
 * 相対時間を表示（〇分前、〇時間前など）
 */
export function formatRelativeTime(timestamp: number | string | Date): string {
  const date = typeof timestamp === 'number' || typeof timestamp === 'string' 
    ? new Date(timestamp) 
    : timestamp;
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) {
    return 'たった今';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分前`;
  } else if (diffHours < 24) {
    return `${diffHours}時間前`;
  } else if (diffDays < 7) {
    return `${diffDays}日前`;
  } else {
    return formatDateJST(date);
  }
}