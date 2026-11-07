export function pad2(value) {
  return String(value).padStart(2, "0");
}

export function create_stamp_code(prefix, date = new Date()) {
  const year = date.getFullYear();
  const month_day = `${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
  const time = `${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
  return `${prefix}-${year}-${month_day}-${time}`;
}
