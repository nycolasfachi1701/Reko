import "server-only";

// Hash de senha com scrypt (crypto nativo do Node — sem binário externo, roda em
// qualquer ambiente, inclusive com Application Control/Smart App Control ativo).
// A lógica vive em ./scrypt (módulo puro, sem "server-only") para ser reutilizada
// pelo seed e pelos fixtures de teste. Aqui só reexportamos, mantendo o guard
// "server-only" no caminho que o app usa.
export { hashPassword, verifyPassword } from "./scrypt";
