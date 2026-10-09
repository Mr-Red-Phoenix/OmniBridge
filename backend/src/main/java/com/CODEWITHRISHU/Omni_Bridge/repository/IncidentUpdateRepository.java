package com.CODEWITHRISHU.Omni_Bridge.repository;

import com.CODEWITHRISHU.Omni_Bridge.entity.incident.IncidentUpdate;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface IncidentUpdateRepository
        extends JpaRepository<IncidentUpdate, Long> {
    @Query("""
            select u from IncidentUpdate u
            left join fetch u.author
            where u.incident.id = :incidentId
            order by u.createdAt asc
            """)
    List<IncidentUpdate> findTimeline(@Param("incidentId") Long incidentId);
}