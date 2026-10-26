/**
 * Scientific Knowledge Graph Integration Engine
 * Author: @Dungsky
 */

export enum EntityType {
  PAPER = 'PAPER',
  DATASET = 'DATASET',
  NOTEBOOK = 'NOTEBOOK',
  PROTOCOL = 'PROTOCOL',
  AUTHOR = 'AUTHOR',
  METHOD = 'METHOD',
  METRIC = 'METRIC',
  CONCEPT = 'CONCEPT'
}

export enum RelationType {
  AUTHORED_BY = 'AUTHORED_BY',
  UTILIZES_DATASET = 'UTILIZES_DATASET',
  IMPLEMENTS_METHOD = 'IMPLEMENTS_METHOD',
  CITES = 'CITES',
  MEASURES_METRIC = 'MEASURES_METRIC',
  RELATES_TO = 'RELATES_TO'
}

export interface GraphEntity {
  id: string;
  type: EntityType;
  name: string;
  properties: Record<string, unknown>;
  confidence: number;
}

export interface GraphRelation {
  sourceId: string;
  targetId: string;
  type: RelationType;
  weight: number;
  properties: Record<string, unknown>;
}

export interface ScientificGraph {
  entities: Map<string, GraphEntity>;
  relations: GraphRelation[];
}

export interface ContentPayload {
  id: string;
  type: EntityType;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
}

export class ScientificKnowledgeGraphEngine {
  private graph: ScientificGraph;

  constructor() {
    this.graph = {
      entities: new Map<string, GraphEntity>(),
      relations: []
    };
  }

  public ingestContent(payload: ContentPayload): void {
    const primaryEntity: GraphEntity = {
      id: payload.id,
      type: payload.type,
      name: payload.title,
      properties: payload.metadata,
      confidence: 1.0
    };

    this.graph.entities.set(primaryEntity.id, primaryEntity);
    this.extractAndLinkEntities(payload);
  }

  private extractAndLinkEntities(payload: ContentPayload): void {
    const text = payload.content;
    
    // Pattern extraction for scientific metrics and methods using regex heuristic pipelines
    const methodMatches = text.matchAll(/(?:using|employing|utilizing)\s+([A-Z][a-zA-Z0-9_\-\s]{3,30})/g);
    for (const match of methodMatches) {
      const methodName = match[1].trim();
      const methodId = `method_${this.slugify(methodName)}`;
      
      if (!this.graph.entities.has(methodId)) {
        this.graph.entities.set(methodId, {
          id: methodId,
          type: EntityType.METHOD,
          name: methodName,
          properties: {},
          confidence: 0.85
        });
      }

      this.addRelation({
        sourceId: payload.id,
        targetId: methodId,
        type: RelationType.IMPLEMENTS_METHOD,
        weight: 0.9,
        properties: {}
      });
    }

    // Dataset reference extraction
    const datasetMatches = text.matchAll(/(?:dataset|corpus|benchmark)\s*:?\s*([A-Z][a-zA-Z0-9_\-\s]{3,25})/g);
    for (const match of datasetMatches) {
      const datasetName = match[1].trim();
      const datasetId = `dataset_${this.slugify(datasetName)}`;

      if (!this.graph.entities.has(datasetId)) {
        this.graph.entities.set(datasetId, {
          id: datasetId,
          type: EntityType.DATASET,
          name: datasetName,
          properties: {},
          confidence: 0.80
        });
      }

      this.addRelation({
        sourceId: payload.id,
        targetId: datasetId,
        type: RelationType.UTILIZES_DATASET,
        weight: 0.95,
        properties: {}
      });
    }
  }

  public addRelation(relation: GraphRelation): void {
    const exists = this.graph.relations.some(
      r => r.sourceId === relation.sourceId && r.targetId === relation.targetId && r.type === relation.type
    );

    if (!exists) {
      this.graph.relations.push(relation);
    }
  }

  public getNeighborhood(entityId: string, depth: number = 1): ScientificGraph {
    const neighborhoodEntities = new Map<string, GraphEntity>();
    const neighborhoodRelations: GraphRelation[] = [];
    const visited = new Set<string>();
    let currentQueue = [entityId];

    for (let d = 0; d < depth; d++) {
      const nextQueue: string[] = [];
      for (const currentId of currentQueue) {
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        const entity = this.graph.entities.get(currentId);
        if (entity) {
          neighborhoodEntities.set(currentId, entity);
        }

        for (const rel of this.graph.relations) {
          if (rel.sourceId === currentId || rel.targetId === currentId) {
            neighborhoodRelations.push(rel);
            const neighborId = rel.sourceId === currentId ? rel.targetId : rel.sourceId;
            if (!visited.has(neighborId)) {
              nextQueue.push(neighborId);
            }
          }
        }
      }
      currentQueue = nextQueue;
    }

    // Ensure target entities of collected relations are included
    for (const rel of neighborhoodRelations) {
      const src = this.graph.entities.get(rel.sourceId);
      const tgt = this.graph.entities.get(rel.targetId);
      if (src) neighborhoodEntities.set(src.id, src);
      if (tgt) neighborhoodEntities.set(tgt.id, tgt);
    }

    return {
      entities: neighborhoodEntities,
      relations: neighborhoodRelations
    };
  }

  public exportGraph(): { entities: GraphEntity[]; relations: GraphRelation[] } {
    return {
      entities: Array.from(this.graph.entities.values()),
      relations: [...this.graph.relations]
    };
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
}
