package com.CODEWITHRISHU.Omni_Bridge.repository;

import com.CODEWITHRISHU.Omni_Bridge.entity.OtpVerification;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface OtpVerificationRepository extends JpaRepository<OtpVerification, Long> {
    Optional<OtpVerification> findTopByUserAndVerifiedFalseOrderByCreatedAtDesc(StaffUser user);

    boolean existsByUserAndVerifiedTrueAndExpiresAtAfter(StaffUser user, Instant now);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from OtpVerification o where o.user = :user")
    void deleteAllForUser(@Param("user") StaffUser user);

    @Modifying
    @Query("delete from OtpVerification o where o.expiresAt < :now")
    int deleteExpired(@Param("now") Instant now);

}