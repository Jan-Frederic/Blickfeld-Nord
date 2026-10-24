// Liest die Inhalte aus derselben Quelle wie die Website
import { BandService } from '../../src/app/data/band.service';

const band = new BandService();
export const members = band.members;
export const publicShows = band.publicShows;
export const history = band.history;
export const photos = band.photos;
export const friends = band.friends;
export { FAQ } from '../../src/app/data/faq';
export { buildIcs } from '../../src/app/data/calendar';
export const showId = (s: Parameters<BandService['showId']>[0]) => band.showId(s);
export const allShows = band.shows;
export const rehearsals = band.rehearsals;
export { rueckblickJahre } from '../../src/app/data/jahresrueckblick';
export { UEBERSETZUNGEN } from '../../src/app/data/uebersetzungen';
