import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { HealthQueryDto } from './health-query.dto';

async function validateDto(plain: object) {
  const dto = plainToInstance(HealthQueryDto, plain);
  return validate(dto);
}

describe('HealthQueryDto', () => {
  it('accepts valid page and limit', async () => {
    const errors = await validateDto({ page: 1, limit: 10 });
    expect(errors).toHaveLength(0);
  });

  it('accepts defaults when no params provided', async () => {
    const errors = await validateDto({});
    expect(errors).toHaveLength(0);
  });

  it('rejects page less than 1', async () => {
    const errors = await validateDto({ page: 0 });
    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  it('rejects negative page', async () => {
    const errors = await validateDto({ page: -5 });
    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  it('rejects non-integer page', async () => {
    const errors = await validateDto({ page: 1.5 });
    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  it('rejects limit less than 1', async () => {
    const errors = await validateDto({ limit: 0 });
    expect(errors.some((e) => e.property === 'limit')).toBe(true);
  });

  it('rejects limit greater than 100', async () => {
    const errors = await validateDto({ limit: 101 });
    expect(errors.some((e) => e.property === 'limit')).toBe(true);
  });

  it('rejects non-integer limit', async () => {
    const errors = await validateDto({ limit: 5.7 });
    expect(errors.some((e) => e.property === 'limit')).toBe(true);
  });

  it('accepts limit at boundary values', async () => {
    const errorsMin = await validateDto({ limit: 1 });
    const errorsMax = await validateDto({ limit: 100 });
    expect(errorsMin).toHaveLength(0);
    expect(errorsMax).toHaveLength(0);
  });
});
