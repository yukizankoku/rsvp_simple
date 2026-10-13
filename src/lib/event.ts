export function eventInfo() {
  return {
    name: process.env.EVENT_NAME || "Our Event",
    date: process.env.EVENT_DATE || "",
    location: process.env.EVENT_LOCATION || "",
  };
}
