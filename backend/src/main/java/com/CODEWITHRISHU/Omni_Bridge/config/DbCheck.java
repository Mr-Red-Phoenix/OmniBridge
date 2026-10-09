package com.CODEWITHRISHU.Omni_Bridge.config;

import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import com.CODEWITHRISHU.Omni_Bridge.repository.StaffUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DbCheck implements CommandLineRunner {
    private static final Logger logger = LoggerFactory.getLogger(DbCheck.class);
    private final StaffUserRepository staffUserRepository;

    public DbCheck(StaffUserRepository staffUserRepository) {
        this.staffUserRepository = staffUserRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        logger.info("=========================================");
        logger.info("CHECKING DB DATA FOR STAFF USERS:");
        for (StaffUser u : staffUserRepository.findAll()) {
            logger.info("User: {} | Venue: {} ({})", u.getEmail(), u.getVenue().getName(), u.getVenue().getSlug());
        }
        logger.info("=========================================");
    }
}
