from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

ShortText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]
RequiredText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class CreativeBrief(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Annotated[RequiredText, Field(max_length=200)]
    details: Annotated[RequiredText, Field(max_length=2000)]
    type: Literal["event", "service", "app", "product", "personal"] = "event"
    brand: ShortText = ""
    audience: ShortText = ""
    when: ShortText = ""
    where: ShortText = ""
    cta: ShortText = ""
    tone: Literal["Gần gũi", "Chuyên nghiệp", "Súc tích"] = "Gần gũi"
    concept: int = Field(default=0, ge=0, le=2)


class CreativeContent(BaseModel):
    headline: Annotated[RequiredText, Field(max_length=160)]
    body: Annotated[RequiredText, Field(max_length=4000)]
    reminder: Annotated[RequiredText, Field(max_length=2000)]
    script: Annotated[RequiredText, Field(max_length=4000)]
    cta: Annotated[RequiredText, Field(max_length=200)]
    image_prompt: Annotated[
        RequiredText,
        Field(
            max_length=2000,
            description="ENGLISH ONLY. Visual description for an image generation model.",
        ),
    ]


class CreativeResponse(BaseModel):
    outputs: CreativeContent
    model: str
