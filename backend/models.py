from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


class Metric(Base):
    __tablename__ = "metric"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    source_table = Column(String, nullable=False)
    expected_refresh_cron = Column(String, nullable=False)
    alert_threshold_pct = Column(Float, default=10.0)
    is_active = Column(Boolean, default=True)

    incidents = relationship("Incident", back_populates="metric")


class Incident(Base):
    __tablename__ = "incident"

    id = Column(String, primary_key=True)
    metric_id = Column(String, ForeignKey("metric.id"), nullable=False)
    detected_at = Column(DateTime, nullable=False)
    severity = Column(String, nullable=False)
    root_cause = Column(String, nullable=False)
    summary = Column(Text)
    lineage_json = Column(Text, nullable=False)
    status = Column(String, default="open", nullable=False)

    metric = relationship("Metric", back_populates="incidents")
    checks = relationship(
        "CheckResult",
        back_populates="incident",
        cascade="all, delete-orphan",
        order_by="CheckResult.order_index",
    )
    decisions = relationship(
        "Decision",
        back_populates="incident",
        cascade="all, delete-orphan",
        order_by="Decision.decided_at",
    )


class CheckResult(Base):
    __tablename__ = "check_result"

    id = Column(String, primary_key=True)
    incident_id = Column(String, ForeignKey("incident.id"), nullable=False)
    check_name = Column(String, nullable=False)
    passed = Column(Boolean, nullable=False)
    severity = Column(String, nullable=False)
    detail = Column(Text, nullable=False)
    order_index = Column(Integer, nullable=False)

    incident = relationship("Incident", back_populates="checks")


class Decision(Base):
    __tablename__ = "decision"

    id = Column(String, primary_key=True)
    incident_id = Column(String, ForeignKey("incident.id"), nullable=False)
    action = Column(String, nullable=False)
    note = Column(Text)
    analyst = Column(String, nullable=False)
    decided_at = Column(DateTime, nullable=False)

    incident = relationship("Incident", back_populates="decisions")
