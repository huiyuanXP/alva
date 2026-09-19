import type {
  ProjectData,
  NativeScene,
  RoomInfo,
} from "../../packages/contracts/index.js";
export function sampleProject(id: string): ProjectData {
  const rooms: RoomInfo[] = [
    {
      id: "living",
      name: "客厅",
      floor_id: "ground",
      wall_ids: ["living-n", "living-e", "living-s", "living-w"],
      geometry_cm: { width: 480, depth: 400, height: 280 },
      bounds: { x: 0, y: 0, width: 480, depth: 400 },
    },
    {
      id: "room2",
      name: "房间 2",
      floor_id: "ground",
      wall_ids: ["room2-n", "room2-e", "room2-s", "room2-w"],
      geometry_cm: { width: 320, depth: 360, height: 280 },
      bounds: { x: 550, y: 0, width: 320, depth: 360 },
    },
  ];
  const walls = rooms.flatMap((r) => {
    const { x, y, width: w, depth: d } = r.bounds;
    const p = [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + d },
      { x, y: y + d },
    ];
    return p.map((start, i) => ({
      id: r.wall_ids[i],
      start,
      end: p[(i + 1) % 4],
      thickness: 12,
      height: 280,
      color: "#d9d4ca",
      interiorColor: "#e8e3da",
    }));
  });
  const items = [
    ["sofa-main", "sofa", 230, 335, 200, 90, 80, "#b5bfaa"],
    ["coffee-main", "coffee_table", 230, 215, 115, 60, 42, "#927c63"],
    ["rug-main", "rug", 230, 220, 270, 200, 1, "#e4ddce"],
    ["chair-main", "chair", 390, 210, 75, 80, 88, "#beac98"],
    ["plant-main", "potted_plant", 70, 75, 45, 45, 75, "#65896b"],
    ["desk-room2", "desk", 710, 75, 140, 65, 75, "#ba9f7c"],
  ] as const;
  const now = new Date().toISOString();
  const scene: NativeScene = {
    id,
    name: "我们的家 · 初步咨询",
    activeFloorId: "ground",
    createdAt: now,
    updatedAt: now,
    floors: [
      {
        id: "ground",
        name: "单层样例",
        level: 0,
        walls,
        rooms: rooms.map((r) => ({
          id: r.id,
          name: r.name,
          walls: r.wall_ids,
          floorTexture: "wood",
          area: (r.geometry_cm.width * r.geometry_cm.depth) / 10000,
          color: "#e9e1d1",
        })),
        doors: [],
        windows: [],
        furniture: items.map(
          ([id, catalogId, x, y, width, depth, height, color]) => ({
            id,
            catalogId,
            position: { x, y },
            rotation: 0,
            scale: { x: 1, y: 1, z: 1 },
            width,
            depth,
            height,
            color,
          }),
        ),
        stairs: [],
        columns: [],
        guides: [],
        measurements: [],
        annotations: [],
        textAnnotations: [],
        groups: [],
      },
    ],
  };
  return {
    id,
    name: scene.name,
    version: 0,
    brief_version: 0,
    scene,
    rooms,
    requirements: [],
    evidence: [],
    messages: [],
    suggestions: [],
    reports: [],
    revisions: [],
  };
}
