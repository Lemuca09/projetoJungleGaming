import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
  return new BadRequestException(collectValidationMessages(errors));
}

function collectValidationMessages(errors: ValidationError[]): string[] {
  const messages: string[] = [];
  for (const error of errors) {
    for (const [key, message] of Object.entries(error.constraints ?? {})) {
      messages.push(key === 'whitelistValidation' ? `O campo ${error.property} não é aceito.` : message);
    }
    if (error.children?.length) messages.push(...collectValidationMessages(error.children));
  }
  return messages.length > 0 ? messages : ['Corpo da requisição inválido.'];
}
