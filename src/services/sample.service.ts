import { z } from 'zod'
import { Decimal } from 'decimal.js'
import { type Row } from '../controllers/experiment.controller.js'

const analysis = z.object({
  epsilon_25: z.any().transform(val => new Decimal(val)),
  epsilon_50: z.any().transform(val => new Decimal(val)),
  epsilon_max: z.any().transform(val => new Decimal(val)),
  epsilon_u: z.any().transform(val => new Decimal(val)),
  sigma_25: z.any().transform(val => new Decimal(val)),
  sigma_50: z.any().transform(val => new Decimal(val)),
  sigma_max: z.any().transform(val => new Decimal(val)),
  sigma_u: z.any().transform(val => new Decimal(val))
})

export function analyzeData (data: Array<Row>): Analysis {
  let sigma_max = new Decimal(0)
  let sigma_u = new Decimal(0)
  let epsilon_max = new Decimal(0)
  let epsilon_u = new Decimal(0)
  let found = false

  for (let row of data) {
    if (row.strain.gt(epsilon_max)) {
      epsilon_max = row.strain
    }

    if (row.stress.gt(sigma_max)) {
      sigma_max = row.stress
      sigma_u = row.stress
      epsilon_u = row.strain
    }
  }

  let epsilon_25 = new Decimal(0)
  let epsilon_50 = new Decimal(0)
  let sigma_50 = sigma_u.times(0.5)
  let sigma_25 = sigma_u.times(0.25)

  let left, right
  for (let i = 0; i < data.length - 1; i++) {
    // We're only interested in values before the ultimate stress
    if (data[i]!.stress.gte(sigma_max)) break

    left = data[i]!
    right = data[i + 1]!

    if (sigma_25.gte(left.stress) && sigma_25.lte(right.stress)) {
      epsilon_25 = linear_interpolation(left.strain, left.stress, right.strain, right.stress, sigma_25)
    } else if (sigma_50.gte(left.stress) && sigma_50.lte(right.stress)) {
      epsilon_50 = linear_interpolation(left.strain, left.stress, right.strain, right.stress, sigma_50)

      // Epsilon_25 is always found before Epsilon_50
      found = true
    }

    if (found) break
  }

  return {
    epsilon_25,
    epsilon_50,
    epsilon_max,
    epsilon_u,
    sigma_25,
    sigma_50,
    sigma_max,
    sigma_u
  }
}

function linear_interpolation (x_a: Decimal, y_a: Decimal, x_b: Decimal, y_b: Decimal, y_1: Decimal): Decimal {
  let numerator = x_b.minus(x_a)
  let denominator = y_b.minus(y_a)
  let substraction = y_1.minus(y_a)

  let quotient = numerator.div(denominator)
  let product = substraction.times(quotient)

  return x_a.add(product)
}

export type Analysis = z.infer<typeof analysis>