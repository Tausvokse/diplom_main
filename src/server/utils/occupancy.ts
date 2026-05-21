export const getOccupancyStatus = (current: number, total: number) => {
  if (!total || total <= 0) {
    return 'STABLE';
  }
  const ratio = current / total;
  if (ratio >= 0.95) {
    return 'OVERLOADED';
  }
  if (ratio >= 0.8) {
    return 'NEAR_LIMIT';
  }
  return 'STABLE';
};
