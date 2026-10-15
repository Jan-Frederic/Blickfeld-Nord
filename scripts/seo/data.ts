// Liest die Inhalte aus derselben Quelle wie die Website
import { BandService } from '../../src/app/data/band.service';

const band = new BandService();
export const members = band.members;
export const publicShows = band.publicShows;
export const history = band.history;
export const photos = band.photos;
export const friends = band.friends;
