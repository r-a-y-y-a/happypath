// NUS internal shuttle (routes A1, A2, D1, D2) frequency, from NUS's own "Frequency Range" notice (Campus Life, Sep 2023).
// It publishes headways, not stop lists or departure times, so this says how often a bus comes, not exactly when.
// Set NUS_VACATION=1 during vacation periods, because the notice has different headways for them.

// Kent Ridge campus: UTown, Science, COM, PGP and Kent Ridge MRT all fall inside this box.
const CAMPUS = { south: 1.288, north: 1.311, west: 103.769, east: 103.788 }

export const onNusCampus = ([lat, lng]) =>
  lat >= CAMPUS.south && lat <= CAMPUS.north && lng >= CAMPUS.west && lng <= CAMPUS.east

const sgNow = (iso) => {
  const d = iso && !Number.isNaN(Date.parse(iso)) ? new Date(iso) : new Date()
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Singapore', weekday: 'short', hour: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).map((x) => [x.type, x.value]))
  return { day: p.weekday, hour: Number(p.hour) }
}

// Evening is taken to start at 18:00. The notice does not give clock times for its bands.
export function shuttleInfo(departIso) {
  const { day, hour } = sgNow(departIso)
  const vacation = process.env.NUS_VACATION === '1'
  const evening = hour >= 18
  let range
  if (day === 'Sun') range = [30, 30]
  else if (day === 'Sat') range = evening ? [30, 30] : [15, 15]
  else if (evening) range = vacation ? [30, 30] : [15, 15]
  else range = vacation ? [7, 13] : [5, 11]
  return {
    routes: ['A1', 'A2', 'D1', 'D2'],
    every_min: range,
    note: `${vacation && day !== 'Sat' && day !== 'Sun' ? 'Vacation' : 'Typical'} frequency from NUS. Sundays and public holidays run about every 30 min. Check NUS NextBus for live times.`,
  }
}
