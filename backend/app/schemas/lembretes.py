from datetime import date, datetime
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

Canal = Literal["whatsapp", "email", "sms"]
Condicao = Literal["sempre", "se_nao_cumprido"]


class OffsetItem(BaseModel):
    when: Literal["before", "after"]
    days: int = Field(ge=0)
    hora: Optional[str] = Field(None, description="HH:MM")
    condicao: Optional[Condicao] = None


class LembreteBase(BaseModel):
    titulo: str
    corpo: Optional[str] = None
    canal: Canal
    event_date: Optional[date] = None
    rrule: Optional[str] = None
    dtstart: Optional[datetime] = None
    tz: Optional[str] = "America/Sao_Paulo"
    offsets: Optional[List[OffsetItem]] = None
    condicao: Condicao = "sempre"
    meta: Optional[dict] = None
    ativa: bool = True
    proxima_execucao_at: Optional[datetime] = None


class LembreteCreate(LembreteBase):
    cliente_id: UUID
    fatura_id: Optional[UUID] = None

    @model_validator(mode="after")
    def _validate_regras(self):
        has_rrule = self.rrule is not None
        has_fatura = self.fatura_id is not None
        has_offsets = bool(self.offsets)

        # Regra 1: lembrete periódico (rrule) NÃO pode ter fatura_id/offsets
        if has_rrule and (has_fatura or has_offsets):
            raise ValueError(
                "Lembrete periódico (rrule) não pode ter fatura_id/offsets."
            )

        # Regra 2: sem rrule => exige fatura + offsets (seu caso de fatura)
        if not has_rrule and not (has_fatura and has_offsets):
            raise ValueError(
                "Lembrete de fatura exige fatura_id e offsets (sem rrule)."
            )

        return self


class LembreteUpdate(BaseModel):
    # permitir atualização parcial, mas manter regra de exclusividade
    titulo: Optional[str] = None
    corpo: Optional[str] = None
    canal: Optional[Canal] = None
    event_date: Optional[date] = None
    rrule: Optional[str] = None
    dtstart: Optional[datetime] = None
    tz: Optional[str] = None
    offsets: Optional[List[OffsetItem]] = None
    condicao: Optional[Condicao] = None
    meta: Optional[dict] = None
    ativa: Optional[bool] = None
    cliente_id: Optional[UUID] = None
    fatura_id: Optional[UUID] = None


class LembreteOut(LembreteBase):
    id: UUID
    cliente_id: UUID
    fatura_id: Optional[UUID] = None

    class Config:
        from_attributes = True


# Preview de próximas execuções
class PreviewRequest(BaseModel):
    # para periódicos, usa rrule/dtstart; para fatura usa offsets + vencimento
    limit: int = 10


class ExecucaoItem(BaseModel):
    scheduled_at: datetime
    origem: Literal["rrule", "offset"]
    motivo_skip: Optional[str] = None


class PreviewResponse(BaseModel):
    execucoes: List[ExecucaoItem]
