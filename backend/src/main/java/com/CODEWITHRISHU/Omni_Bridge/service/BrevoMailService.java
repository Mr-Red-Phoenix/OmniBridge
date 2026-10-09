package com.CODEWITHRISHU.Omni_Bridge.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class BrevoMailService {

    private static final URI ENDPOINT = URI.create("https://api.brevo.com/v3/smtp/email");

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final ObjectMapper json = new ObjectMapper();

    @Value("${brevo.api.key}")
    private String apiKey;

    @Value("${spring.mail.from}")
    private String fromEmail;

    @Value("${app.name:Omni Bridge}")
    private String appName;

    private static String esc(String s) {
        return HtmlUtils.htmlEscape(s == null ? "" : s);
    }

    public String appName() {
        return appName;
    }

    public boolean send(String toEmail, String subject, String htmlContent) {
        try {
            String body = json.writeValueAsString(Map.of(
                    "sender", Map.of("name", appName, "email", fromEmail),
                    "to", List.of(Map.of("email", toEmail)),
                    "subject", subject,
                    "htmlContent", htmlContent));

            HttpRequest request = HttpRequest.newBuilder(ENDPOINT)
                    .timeout(Duration.ofSeconds(10))
                    .header("accept", "application/json")
                    .header("api-key", apiKey)
                    .header("content-type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 201) {
                return true;
            }
            log.error("Brevo rejected email. status={} body={}", response.statusCode(), response.body());
            return false;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } catch (Exception e) {
            log.error("Brevo request failed: {}", e.getMessage());
            return false;
        }
    }

    @Async
    public void sendAsync(String toEmail, String subject, String htmlContent) {
        send(toEmail, subject, htmlContent);
    }

    public String codeEmail(String name, String code, long minutes) {
        return layout("Security verification",
                "<p>Hello " + esc(name) + ",</p>"
                        + "<p>Your one-time code for " + esc(appName) + ":</p>"
                        + "<p style='font-size:32px;font-weight:bold;letter-spacing:6px'>" + esc(code) + "</p>"
                        + "<p style='color:#666'>Valid for " + minutes + " minutes. Never share it with anyone.</p>");
    }

    public String linkEmail(String name, String link, long minutes) {
        return layout("Sign in",
                "<p>Hello " + esc(name) + ",</p>"
                        + "<p><a href='" + esc(link) + "' style='background:#c8102e;color:#fff;padding:12px 24px;"
                        + "text-decoration:none;border-radius:4px;display:inline-block'>Sign in to " + esc(appName) + "</a></p>"
                        + "<p style='color:#666'>This link works once and expires in " + minutes + " minutes.</p>");
    }

    private String layout(String title, String body) {
        return "<div style='font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;"
                + "border:1px solid #e0e0e0;border-radius:8px'><h2>" + esc(title) + "</h2>" + body + "</div>";
    }

}
