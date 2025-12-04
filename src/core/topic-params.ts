import {ParamMap} from "./types";

export function extractPathParams(path: string, map?: ParamMap[]) {
  if (!map) return {};

  const parts = path.split('/');

  return map.reduce<Record<string, string>>((acc, { name, index }) => {
    acc[name] = parts[index];
    return acc;
  }, {});
}

export function wilcardParams(pattern: string) {
  return pattern.replace(/\/:([^\/$+#]+)/g, '/+');
}

export function mapParams(pattern: string): ParamMap[] {
  return pattern
    .split("/")
    .map((segment, idx) => ({ segment, idx }))
    .filter(obj => /^:([^\/$+#]+)$/.test(obj.segment))
    .map(obj => ({
      name: obj.segment.slice(1), // remove leading :
      index: obj.idx
    }));
}