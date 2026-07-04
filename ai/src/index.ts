import { Graph, Node } from '@stratometriq/shared';

export interface AIProvider {
  ask(prompt: string): Promise<string>;
}

export class MockAIProvider implements AIProvider {
  async ask(prompt: string): Promise<string> {
    return Promise.resolve(`Mock AI Response for prompt: "${prompt.substring(0, 50)}..."`);
  }
}

export class InsightsEngine {
  constructor(private ai: AIProvider) {}

  async explainFeature(graph: Graph, featureName: string): Promise<string> {
    const prompt = `Analyze this architecture graph and explain the feature "${featureName}":\n${JSON.stringify(graph)}`;
    return this.ai.ask(prompt);
  }

  async predictImpact(graph: Graph, nodeName: string): Promise<string> {
    const prompt = `If I modify the component "${nodeName}", what else in this graph is likely to break or need updates?\n${JSON.stringify(graph)}`;
    return this.ai.ask(prompt);
  }
}
