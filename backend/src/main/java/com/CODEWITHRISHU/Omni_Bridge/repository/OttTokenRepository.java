package com.CODEWITHRISHU.Omni_Bridge.repository;

import com.CODEWITHRISHU.Omni_Bridge.entity.OttToken;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface OttTokenRepository extends JpaRepository<OttToken, Integer> {
    Optional<OttToken> findByToken(String token);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from OttToken o where o.user = :user")
    void deleteByUser(@Param("user") StaffUser user);

    @Modifying
    @Query("delete from OttToken o where o.expiresAt < :now")
    int deleteExpired(@Param("now") Instant now);

}