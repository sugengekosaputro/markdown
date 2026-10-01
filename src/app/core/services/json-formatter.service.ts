import { Injectable } from '@angular/core';
import {
  JsonParseResult,
  JsonStats,
  JsonTreeNode,
  JsonValueType,
} from '../models/json-workspace.models';

@Injectable({
  providedIn: 'root',
})
export class JsonFormatterService {
  validate(jsonStr: string): JsonParseResult {
    if (!jsonStr || !jsonStr.trim()) {
      return { valid: true, data: null };
    }

    try {
      const data = JSON.parse(jsonStr);
      return { valid: true, data };
    } catch (e: any) {
      const message = e.message || 'Syntax error in JSON string.';
      let errorLine: number | undefined;
      let errorColumn: number | undefined;

      // Extract line/column or position from common V8 error messages
      // e.g. "Unexpected token 'x', ... at line 5 column 10" or "at position 120"
      const lineColMatch = message.match(/line (\d+) column (\d+)/i);
      if (lineColMatch) {
        errorLine = parseInt(lineColMatch[1], 10);
        errorColumn = parseInt(lineColMatch[2], 10);
      } else {
        const posMatch = message.match(/at position (\d+)/i);
        if (posMatch) {
          const pos = parseInt(posMatch[1], 10);
          const lines = jsonStr.slice(0, pos).split('\n');
          errorLine = lines.length;
          errorColumn = lines[lines.length - 1].length + 1;
        }
      }

      return {
        valid: false,
        error: message,
        errorLine,
        errorColumn,
      };
    }
  }

  prettify(jsonStr: string, indent: 2 | 4 | '\t' = 2): string {
    const val = this.validate(jsonStr);
    if (!val.valid) {
      throw new Error(val.error || 'Cannot prettify invalid JSON.');
    }
    return JSON.stringify(val.data, null, indent);
  }

  minify(jsonStr: string): string {
    const val = this.validate(jsonStr);
    if (!val.valid) {
      throw new Error(val.error || 'Cannot minify invalid JSON.');
    }
    return JSON.stringify(val.data);
  }

  sortKeys(jsonStr: string, indent: 2 | 4 | '\t' = 2): string {
    const val = this.validate(jsonStr);
    if (!val.valid) {
      throw new Error(val.error || 'Cannot sort keys of invalid JSON.');
    }
    const sorted = this.sortObjectKeysRecursively(val.data);
    return JSON.stringify(sorted, null, indent);
  }

  private sortObjectKeysRecursively(val: any): any {
    if (Array.isArray(val)) {
      return val.map((item) => this.sortObjectKeysRecursively(item));
    }
    if (val !== null && typeof val === 'object') {
      const sortedKeys = Object.keys(val).sort((a, b) => a.localeCompare(b));
      const result: Record<string, any> = {};
      for (const k of sortedKeys) {
        result[k] = this.sortObjectKeysRecursively(val[k]);
      }
      return result;
    }
    return val;
  }

  calculateStats(jsonStr: string, data?: any): JsonStats {
    const sizeBytes = new Blob([jsonStr]).size;
    const formattedLines = jsonStr.split('\n').length;
    let totalKeys = 0;
    let maxDepth = 0;

    const traverse = (val: any, currentDepth: number) => {
      if (currentDepth > maxDepth) {
        maxDepth = currentDepth;
      }
      if (Array.isArray(val)) {
        for (const item of val) {
          traverse(item, currentDepth + 1);
        }
      } else if (val !== null && typeof val === 'object') {
        const keys = Object.keys(val);
        totalKeys += keys.length;
        for (const k of keys) {
          traverse(val[k], currentDepth + 1);
        }
      }
    };

    if (data !== undefined && data !== null) {
      traverse(data, 1);
    } else {
      const val = this.validate(jsonStr);
      if (val.valid && val.data !== undefined && val.data !== null) {
        traverse(val.data, 1);
      }
    }

    return {
      sizeBytes,
      formattedLines,
      depth: maxDepth,
      totalKeys,
    };
  }

  determineType(val: any): JsonValueType {
    if (val === null) return 'null';
    if (Array.isArray(val)) return 'array';
    const t = typeof val;
    if (t === 'object') return 'object';
    if (t === 'string') return 'string';
    if (t === 'number') return 'number';
    if (t === 'boolean') return 'boolean';
    return 'string';
  }

  parseToTree(
    jsonStr: string,
    defaultExpandDepth: number = 2
  ): { tree: JsonTreeNode[]; error?: string; stats: JsonStats } {
    const val = this.validate(jsonStr);
    if (!val.valid) {
      return {
        tree: [],
        error: val.error,
        stats: { sizeBytes: new Blob([jsonStr]).size, formattedLines: 1, depth: 0, totalKeys: 0 },
      };
    }

    const data = val.data;
    const stats = this.calculateStats(jsonStr, data);

    if (data === null || data === undefined) {
      return {
        tree: [
          {
            id: 'root-null',
            key: 'root',
            value: null,
            type: 'null',
            path: '$',
            depth: 0,
            isExpanded: true,
          },
        ],
        stats,
      };
    }

    const rootType = this.determineType(data);
    let idCounter = 0;

    const buildNode = (
      key: string,
      value: any,
      path: string,
      depth: number
    ): JsonTreeNode => {
      const nodeType = this.determineType(value);
      const isCompound = nodeType === 'object' || nodeType === 'array';
      const isExpanded = depth < defaultExpandDepth;
      const nodeId = `node-${++idCounter}`;

      if (!isCompound) {
        return {
          id: nodeId,
          key,
          value,
          type: nodeType,
          path,
          depth,
          isExpanded: false,
        };
      }

      if (nodeType === 'array') {
        const arr = value as any[];
        const children = arr.map((item, idx) =>
          buildNode(`[${idx}]`, item, `${path}[${idx}]`, depth + 1)
        );
        return {
          id: nodeId,
          key,
          value,
          type: 'array',
          path,
          depth,
          itemCount: arr.length,
          isExpanded,
          children,
        };
      } else {
        // object
        const obj = value as Record<string, any>;
        const keys = Object.keys(obj);
        const children = keys.map((childKey) => {
          const childPath = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(childKey)
            ? `${path}.${childKey}`
            : `${path}["${childKey}"]`;
          return buildNode(childKey, obj[childKey], childPath, depth + 1);
        });
        return {
          id: nodeId,
          key,
          value,
          type: 'object',
          path,
          depth,
          itemCount: keys.length,
          isExpanded,
          children,
        };
      }
    };

    const rootNode = buildNode('root', data, '$', 0);
    return {
      tree: [rootNode],
      stats,
    };
  }
}
