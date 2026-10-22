package com.CODEWITHRISHU.Omni_Bridge.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

@Configuration
@EnableAsync
public class AsyncConfig {

    /**
     * Java 21+ Virtual Thread Executor for lightweight, high-throughput asynchronous execution.
     * Used by the Asynchronous Immutable Audit Ledger Service to ensure non-blocking persistence.
     */
    @Bean(name = "virtualThreadExecutor")
    public Executor virtualThreadExecutor() {
        return Executors.newVirtualThreadPerTaskExecutor();
    }
}
