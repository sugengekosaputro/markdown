import { TestBed } from '@angular/core/testing';
import { JsonFormatterService } from './json-formatter.service';

describe('JsonFormatterService', () => {
  let service: JsonFormatterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JsonFormatterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validate', () => {
    it('should validate valid JSON object', () => {
      const res = service.validate('{"name":"Nobody","version":1}');
      expect(res.valid).toBeTrue();
      expect(res.data).toEqual({ name: 'Nobody', version: 1 });
    });

    it('should report invalid JSON with error details', () => {
      const res = service.validate('{"name": "test",}');
      expect(res.valid).toBeFalse();
      expect(res.error).toBeDefined();
    });
  });

  describe('prettify & minify', () => {
    const raw = '{"b":2,"a":1}';

    it('should prettify JSON with 2 spaces', () => {
      const pretty = service.prettify(raw, 2);
      expect(pretty).toBe('{\n  "b": 2,\n  "a": 1\n}');
    });

    it('should minify JSON', () => {
      const min = service.minify('{\n  "b": 2,\n  "a": 1\n}');
      expect(min).toBe('{"b":2,"a":1}');
    });
  });

  describe('sortKeys', () => {
    it('should sort keys alphabetically', () => {
      const unsorted = '{"z": 1, "a": 2, "m": {"y": 10, "b": 20}}';
      const sorted = service.sortKeys(unsorted, 2);
      const expected = JSON.stringify(
        { a: 2, m: { b: 20, y: 10 }, z: 1 },
        null,
        2
      );
      expect(sorted).toBe(expected);
    });
  });

  describe('parseToTree', () => {
    it('should build hierarchical tree nodes', () => {
      const raw = JSON.stringify({
        title: 'App',
        count: 5,
        items: ['one', 'two'],
        config: { enabled: true },
      });
      const { tree, error, stats } = service.parseToTree(raw, 2);
      expect(error).toBeUndefined();
      expect(tree.length).toBe(1);
      const root = tree[0];
      expect(root.type).toBe('object');
      expect(root.children?.length).toBe(4);
      expect(stats.totalKeys).toBeGreaterThanOrEqual(4);
    });
  });
});
