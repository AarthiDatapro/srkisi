import json
from typing import Type, TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


def _normalize_structured_payload(result, schema: Type[T]):
    """Unwrap wrapper objects common in model outputs."""

    if not isinstance(result, dict):
        return result

    field_names = set(schema.model_fields)

    if field_names and any(field_name in result for field_name in field_names):
        return result

    for key, value in result.items():
        if isinstance(value, dict):
            nested_fields = set(value)
            if field_names and nested_fields & field_names:
                return value

    if len(result) == 1:
        single_value = next(iter(result.values()))
        if isinstance(single_value, dict):
            return single_value

    return result


def parse_structured_result(
    result,
    schema: Type[T],
) -> T:
    """Validate an LLM result against a Pydantic schema."""

    if isinstance(result, schema):
        return result

    if isinstance(result, BaseModel):
        result = result.model_dump()

    if isinstance(result, dict):
        result = _normalize_structured_payload(result, schema)
        return schema.model_validate(result)

    if isinstance(result, str):
        value = result.strip()

        # Remove Markdown code fences, if present.
        if value.startswith("```"):
            lines = value.splitlines()

            if lines and lines[0].startswith("```"):
                lines = lines[1:]

            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]

            value = "\n".join(lines).strip()

        try:
            parsed_value = json.loads(value)
        except json.JSONDecodeError:
            return schema.model_validate_json(value)

        parsed_value = _normalize_structured_payload(parsed_value, schema)
        return schema.model_validate(parsed_value)

    raise TypeError(
        f"Unsupported structured result: "
        f"{type(result).__name__}"
    )