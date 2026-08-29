import { randomInt } from "node:crypto"

/**
 * Genera una contraseña temporal aleatoria y segura.
 * Evita caracteres ambiguos (0/O, 1/I/l) para que sea fácil de copiar.
 */
export function generateTemporaryPassword(length = 10): string {
  // Sin caracteres ambiguos: 0, O, 1, I, l
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += alphabet[randomInt(alphabet.length)]
  }
  return result
}
