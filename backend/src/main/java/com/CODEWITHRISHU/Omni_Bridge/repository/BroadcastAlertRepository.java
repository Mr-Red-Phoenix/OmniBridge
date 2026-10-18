package com.CODEWITHRISHU.Omni_Bridge.repository;

import com.CODEWITHRISHU.Omni_Bridge.entity.broadcast.BroadcastAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BroadcastAlertRepository extends JpaRepository<BroadcastAlert, Long> {

    @Query("""
            select b from BroadcastAlert b
            left join fetch b.author
            where b.venue.id = :venueId and b.active = true
            order by b.createdAt desc
            """)
    List<BroadcastAlert> findActiveForVenue(@Param("venueId") Long venueId);

    @Query("""
            select b from BroadcastAlert b
            left join fetch b.author
            where b.venue.slug = :venueSlug and b.active = true
            order by b.createdAt desc
            """)
    List<BroadcastAlert> findActiveForVenueSlug(@Param("venueSlug") String venueSlug);
}

