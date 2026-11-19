export type Finish = 'nonfoil' | 'foil' | 'etched';

export type CardLayout = 'normal' | 'transform';

export type Color = 'W' | 'U' | 'B' | 'R' | 'G';

export interface CardFace {
  readonly name: string;
  readonly manaCost: string;
  readonly typeLine: string;
  readonly oracleText: string;
  readonly colors: readonly Color[];
  readonly power?: string;
  readonly toughness?: string;
}

export interface Card {
  readonly oracleId: string;
  readonly name: string;
  readonly layout: CardLayout;
  readonly manaValue: number;
  readonly colorIdentity: readonly Color[];
  readonly faces: readonly CardFace[];
}

export interface PrintingImage {
  readonly normal: string;
  readonly artCrop: string;
  readonly artist: string;
}

export interface Printing {
  readonly id: string;
  readonly oracleId: string;
  readonly setCode: string;
  readonly setName: string;
  readonly collectorNumber: string;
  readonly lang: string;
  readonly releasedOn: string;
  readonly finishes: readonly Finish[];
  readonly scryfallUrl: string;
  readonly images: readonly PrintingImage[];
}

export interface CatalogSource {
  readonly name: string;
  readonly url: string;
  readonly retrievedOn: string;
}

export interface Catalog {
  readonly schemaVersion: 1;
  readonly source: CatalogSource;
  readonly cards: readonly Card[];
  readonly printings: readonly Printing[];
}
