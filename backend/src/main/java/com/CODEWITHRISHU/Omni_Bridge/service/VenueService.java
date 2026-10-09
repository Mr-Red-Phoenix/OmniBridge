package com.CODEWITHRISHU.Omni_Bridge.service;

import com.CODEWITHRISHU.Omni_Bridge.exception.VenueNotFoundException;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.Venue;
import com.CODEWITHRISHU.Omni_Bridge.repository.VenueRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class VenueService {
    private final VenueRepository venueRepository;

    public VenueService(VenueRepository venueRepository) {
        this.venueRepository = venueRepository;
    }

    public Venue getBySlug(String slug) {
        return venueRepository.findBySlug(slug)
                .orElseThrow(() -> new VenueNotFoundException(slug));
    }

    public List<Venue> getAll() {
        return venueRepository.findAll();
    }
}
