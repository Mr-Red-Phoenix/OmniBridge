package com.CODEWITHRISHU.Omni_Bridge.repository;

import com.CODEWITHRISHU.Omni_Bridge.entity.incident.Incident;
import com.CODEWITHRISHU.Omni_Bridge.entity.incident.IncidentStatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface IncidentRepository extends JpaRepository<Incident, Long> {
    @Query("""
            select i from Incident i
            left join fetch i.assignedTo
            where i.venue.id = :venueId
              and i.status not in :excluded
            order by i.createdAt desc
            """)
    List<Incident> findOpenForVenue(
            @Param("venueId") Long venueId,
            @Param("excluded") List<IncidentStatus> excluded);

    @Query("""
            select i from Incident i
            left join fetch i.assignedTo
            where i.venue.id = :venueId
            order by i.createdAt desc
            """)
    List<Incident> findAllForVenue(@Param("venueId") Long venueId);

    @Query("""
            select i from Incident i
            left join fetch i.assignedTo
            where i.id = :id and i.venue.id = :venueId
            """)
    Optional<Incident> findByIdAndVenueId(@Param("id") Long id, @Param("venueId") Long venueId);
}