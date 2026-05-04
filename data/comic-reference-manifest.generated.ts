import type { ComicChapterSceneReferenceRecord } from "@/lib/types";

type ComicReferenceManifest = {
  generatedAt: string | null;
  characters: Record<string, ComicChapterSceneReferenceRecord[]>;
  scenes: Record<string, ComicChapterSceneReferenceRecord[]>;
  chapters: Record<string, { folder: string; references: ComicChapterSceneReferenceRecord[]; }>;
};

const comicReferenceManifest = {
  "generatedAt": "2026-05-04T02:06:09.093Z",
  "characters": {
    "artrans": [
      {
        "label": "Model Sheet",
        "fileName": "model-sheet.jpg",
        "relativePath": "comic/characters/artrans/refs/model-sheet.jpg",
        "extension": "jpg"
      }
    ],
    "coach-ray": [
      {
        "label": "Model Sheet",
        "fileName": "model-sheet.jpg",
        "relativePath": "comic/characters/coach-ray/refs/model-sheet.jpg",
        "extension": "jpg"
      }
    ],
    "dewey-dot": [
      {
        "label": "Model Sheet",
        "fileName": "model-sheet.jpg",
        "relativePath": "comic/characters/dewey-dot/refs/model-sheet.jpg",
        "extension": "jpg"
      }
    ],
    "mira-mistwell": [
      {
        "label": "Model Sheet",
        "fileName": "model-sheet.jpg",
        "relativePath": "comic/characters/mira-mistwell/refs/model-sheet.jpg",
        "extension": "jpg"
      }
    ],
    "muci": [
      {
        "label": "Model Sheet",
        "fileName": "model-sheet.jpg",
        "relativePath": "comic/characters/muci/refs/model-sheet.jpg",
        "extension": "jpg"
      }
    ],
    "nia": [
      {
        "label": "Model Sheet",
        "fileName": "model-sheet.jpg",
        "relativePath": "comic/characters/nia/refs/model-sheet.jpg",
        "extension": "jpg"
      }
    ],
    "padarana": [
      {
        "label": "Model Sheet",
        "fileName": "model-sheet.jpg",
        "relativePath": "comic/characters/padarana/refs/model-sheet.jpg",
        "extension": "jpg"
      }
    ],
    "padaruna": [
      {
        "label": "Model Sheet",
        "fileName": "model-sheet.jpg",
        "relativePath": "comic/characters/padaruna/refs/model-sheet.jpg",
        "extension": "jpg"
      }
    ],
    "professor-cera-lin": [
      {
        "label": "Model Sheet",
        "fileName": "model-sheet.jpg",
        "relativePath": "comic/characters/professor-cera-lin/refs/model-sheet.jpg",
        "extension": "jpg"
      }
    ],
    "snacri": [
      {
        "label": "Model Sheet",
        "fileName": "model-sheet.jpg",
        "relativePath": "comic/characters/snacri/refs/model-sheet.jpg",
        "extension": "jpg"
      }
    ],
    "sunny-spritz": [
      {
        "label": "Model Sheet",
        "fileName": "model-sheet.jpg",
        "relativePath": "comic/characters/sunny-spritz/refs/model-sheet.jpg",
        "extension": "jpg"
      }
    ],
    "vela-sheen": [
      {
        "label": "Model Sheet",
        "fileName": "model-sheet.jpg",
        "relativePath": "comic/characters/vela-sheen/refs/model-sheet.jpg",
        "extension": "jpg"
      }
    ]
  },
  "scenes": {
    "season-01-chapter-01-orientation-week-is-a-scam-barrier-sciences-hall": [
      {
        "label": "Barrier Sciences Hall",
        "fileName": "Barrier Sciences Hall.jpg",
        "relativePath": "comic/seasons/season-01/chapter-01-orientation-week-is-a-scam/scene-refs/Barrier Sciences Hall.jpg",
        "extension": "jpg"
      }
    ],
    "season-01-chapter-01-orientation-week-is-a-scam-dorm-hallway": [
      {
        "label": "Dorm Hallway",
        "fileName": "dorm hallway.jpg",
        "relativePath": "comic/seasons/season-01/chapter-01-orientation-week-is-a-scam/scene-refs/dorm hallway.jpg",
        "extension": "jpg"
      }
    ],
    "season-01-chapter-01-orientation-week-is-a-scam-founder-walk": [
      {
        "label": "Founder Walk",
        "fileName": "Founder Walk.jpg",
        "relativePath": "comic/seasons/season-01/chapter-01-orientation-week-is-a-scam/scene-refs/Founder Walk.jpg",
        "extension": "jpg"
      }
    ],
    "season-01-chapter-01-orientation-week-is-a-scam-neatique-main": [
      {
        "label": "Neatique Main",
        "fileName": "Neatique Main.jpg",
        "relativePath": "comic/seasons/season-01/chapter-01-orientation-week-is-a-scam/scene-refs/Neatique Main.jpg",
        "extension": "jpg"
      }
    ],
    "season-01-chapter-01-orientation-week-is-a-scam-old-restricted-hallway": [
      {
        "label": "Old Restricted Hallway",
        "fileName": "old restricted hallway.jpg",
        "relativePath": "comic/seasons/season-01/chapter-01-orientation-week-is-a-scam/scene-refs/old restricted hallway.jpg",
        "extension": "jpg"
      }
    ],
    "season-01-chapter-01-orientation-week-is-a-scam-residence-hall": [
      {
        "label": "Residence Hall",
        "fileName": "Residence hall.jpg",
        "relativePath": "comic/seasons/season-01/chapter-01-orientation-week-is-a-scam/scene-refs/Residence hall.jpg",
        "extension": "jpg"
      }
    ],
    "season-01-chapter-01-orientation-week-is-a-scam-student-room": [
      {
        "label": "Student Room",
        "fileName": "student room.jpg",
        "relativePath": "comic/seasons/season-01/chapter-01-orientation-week-is-a-scam/scene-refs/student room.jpg",
        "extension": "jpg"
      }
    ],
    "season-01-chapter-01-orientation-week-is-a-scam-student-store": [
      {
        "label": "Student Store",
        "fileName": "Student Store.jpg",
        "relativePath": "comic/seasons/season-01/chapter-01-orientation-week-is-a-scam/scene-refs/Student Store.jpg",
        "extension": "jpg"
      }
    ],
    "season-01-chapter-01-orientation-week-is-a-scam-sunscreen-field": [
      {
        "label": "Sunscreen Field",
        "fileName": "Sunscreen Field.jpg",
        "relativePath": "comic/seasons/season-01/chapter-01-orientation-week-is-a-scam/scene-refs/Sunscreen Field.jpg",
        "extension": "jpg"
      }
    ]
  },
  "chapters": {
    "season-01/chapter-01-orientation-week-is-a-scam": {
      "folder": "comic/seasons/season-01/chapter-01-orientation-week-is-a-scam/scene-refs",
      "references": [
        {
          "label": "Barrier Sciences Hall",
          "fileName": "Barrier Sciences Hall.jpg",
          "relativePath": "comic/seasons/season-01/chapter-01-orientation-week-is-a-scam/scene-refs/Barrier Sciences Hall.jpg",
          "extension": "jpg"
        },
        {
          "label": "Dorm Hallway",
          "fileName": "dorm hallway.jpg",
          "relativePath": "comic/seasons/season-01/chapter-01-orientation-week-is-a-scam/scene-refs/dorm hallway.jpg",
          "extension": "jpg"
        },
        {
          "label": "Founder Walk",
          "fileName": "Founder Walk.jpg",
          "relativePath": "comic/seasons/season-01/chapter-01-orientation-week-is-a-scam/scene-refs/Founder Walk.jpg",
          "extension": "jpg"
        },
        {
          "label": "Neatique Main",
          "fileName": "Neatique Main.jpg",
          "relativePath": "comic/seasons/season-01/chapter-01-orientation-week-is-a-scam/scene-refs/Neatique Main.jpg",
          "extension": "jpg"
        },
        {
          "label": "Old Restricted Hallway",
          "fileName": "old restricted hallway.jpg",
          "relativePath": "comic/seasons/season-01/chapter-01-orientation-week-is-a-scam/scene-refs/old restricted hallway.jpg",
          "extension": "jpg"
        },
        {
          "label": "Residence Hall",
          "fileName": "Residence hall.jpg",
          "relativePath": "comic/seasons/season-01/chapter-01-orientation-week-is-a-scam/scene-refs/Residence hall.jpg",
          "extension": "jpg"
        },
        {
          "label": "Student Room",
          "fileName": "student room.jpg",
          "relativePath": "comic/seasons/season-01/chapter-01-orientation-week-is-a-scam/scene-refs/student room.jpg",
          "extension": "jpg"
        },
        {
          "label": "Student Store",
          "fileName": "Student Store.jpg",
          "relativePath": "comic/seasons/season-01/chapter-01-orientation-week-is-a-scam/scene-refs/Student Store.jpg",
          "extension": "jpg"
        },
        {
          "label": "Sunscreen Field",
          "fileName": "Sunscreen Field.jpg",
          "relativePath": "comic/seasons/season-01/chapter-01-orientation-week-is-a-scam/scene-refs/Sunscreen Field.jpg",
          "extension": "jpg"
        }
      ]
    }
  }
} satisfies ComicReferenceManifest;

export default comicReferenceManifest;
