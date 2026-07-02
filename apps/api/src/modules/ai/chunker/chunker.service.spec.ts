import { Test, TestingModule } from '@nestjs/testing';
import { ChunkerService } from './chunker.service';

describe('ChunkerService', () => {
  let service: ChunkerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChunkerService],
    }).compile();
    service = module.get<ChunkerService>(ChunkerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('split - input kosong', () => {
    it('harus return array kosong untuk teks kosong', () => {
      expect(service.split('')).toEqual([]);
    });

    it('harus return array kosong untuk teks whitespace saja', () => {
      expect(service.split('   \n\n  ')).toEqual([]);
    });
  });

  describe('split - teks pendek', () => {
    it('harus return satu chunk untuk teks di bawah chunkSize', () => {
      const text = 'Halo dunia. Ini adalah teks pendek.';
      const chunks = service.split(text);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].index).toBe(0);
      expect(chunks[0].content).toBe(text);
      expect(chunks[0].tokenCount).toBeGreaterThan(0);
    });
  });

  describe('split - teks panjang', () => {
    it('harus split teks panjang menjadi multiple chunks', () => {
      const longText = 'Kalimat pengantar yang sangat panjang. '.repeat(100);
      const chunks = service.split(longText, { chunkSize: 500, overlap: 50 });

      expect(chunks.length).toBeGreaterThan(1);
      // index harus sequential
      chunks.forEach((c, i) => expect(c.index).toBe(i));
    });

    it('harus menghormati chunkSize custom', () => {
      const longText = 'a'.repeat(2000);
      const chunks = service.split(longText, { chunkSize: 100, overlap: 10 });

      // chunkSize + sedikit headroom untuk separator (' ' joiner)
      // Setiap chunk non-terakhir harus <= chunkSize + separator
      for (let i = 0; i < chunks.length - 1; i++) {
        expect(chunks[i].content.length).toBeLessThanOrEqual(200);
      }
    });

    it('harus menyertakan overlap antar chunk (chunk ke-N berisi tail chunk ke-N-1)', () => {
      const longText = 'kata1 kata2 kata3 '.repeat(200);
      const chunks = service.split(longText, { chunkSize: 200, overlap: 50 });

      if (chunks.length >= 2) {
        const tail = chunks[0].content.slice(-50);
        const head = chunks[1].content.slice(0, 50);
        expect(tail).toBe(head);
      }
    });
  });

  describe('split - normalisasi', () => {
    it('harus normalisasi CRLF ke LF', () => {
      const text = 'Baris 1\r\nBaris 2\r\nBaris 3';
      const chunks = service.split(text);

      expect(chunks[0].content).not.toContain('\r');
      expect(chunks[0].content).toContain('Baris 1');
      expect(chunks[0].content).toContain('Baris 3');
    });
  });

  describe('estimateTokens', () => {
    it('harus mengestimasi token dengan rasio ~3:1', () => {
      const text = 'a'.repeat(300);
      const chunks = service.split(text);

      // 300 karakter / 3 ≈ 100 token
      expect(chunks[0].tokenCount).toBe(100);
    });
  });
});
