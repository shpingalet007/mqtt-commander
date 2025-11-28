export function getFullTopic(topic: string, route?: string) {
  return (route) ? `${route}/${topic}` : topic;
}

export function getReqTopic(topic: string) {
  return `__req/${topic}`;
}

export function getResTopic(topic: string) {
  return `__res/${topic}`;
}

export function convertReqToResTopic(topic: string) {
  return topic.replace(/^__req\//g, '__res/');
}

export function getIdTopic(topic: string, id: string) {
  return `${topic}/${id}`;
}