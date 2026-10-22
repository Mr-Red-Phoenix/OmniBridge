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

    @Query("""
            select u from IncidentUpdate u
            left join fetch u.author
            where u.incident.id = :incidentId
              and u.isPublicToGuest = true
            order by u.createdAt asc
            """)
    List<IncidentUpdate> findPublicTimeline(@Param("incidentId") Long incidentId);

    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update IncidentUpdate u set u.author = null where u.author = :staff")
    void nullifyAuthor(@Param("staff") com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser staff);
}