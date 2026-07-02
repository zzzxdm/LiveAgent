package chatwire

import (
	"strings"
	"testing"

	gatewayv1 "github.com/liveagent/agent-gateway/internal/proto/v1"
)

func TestEventPayloadPreservesHostedSearch(t *testing.T) {
	payload := EventPayload(&gatewayv1.ChatEvent{
		Type:           gatewayv1.ChatEvent_HOSTED_SEARCH,
		ConversationId: "conversation-1",
		Data:           `{"id":"search-1","provider":"codex","status":"completed","queries":["设计模式定义"],"sources":[{"url":"https://example.com/pattern","title":"设计模式"}],"round":2}`,
	}, 7)

	if payload["type"] != "hosted_search" {
		t.Fatalf("expected hosted_search type, got %#v", payload["type"])
	}
	if payload["conversation_id"] != "conversation-1" {
		t.Fatalf("expected conversation id, got %#v", payload["conversation_id"])
	}
	if payload["id"] != "search-1" {
		t.Fatalf("expected search id, got %#v", payload["id"])
	}
	if payload["provider"] != "codex" {
		t.Fatalf("expected provider, got %#v", payload["provider"])
	}
	if payload["status"] != "completed" {
		t.Fatalf("expected status, got %#v", payload["status"])
	}
	if payload["seq"] != int64(7) {
		t.Fatalf("expected seq 7, got %#v", payload["seq"])
	}
}

func TestEventPayloadPreservesToolCallDeltaType(t *testing.T) {
	payload := EventPayload(&gatewayv1.ChatEvent{
		Type:           gatewayv1.ChatEvent_TOOL_CALL,
		ConversationId: "conversation-1",
		Data:           `{"type":"tool_call_delta","id":"call-write","name":"Write","arguments":{"path":"src/app.ts","content":"con"},"round":1}`,
	}, 8)

	if payload["type"] != "tool_call_delta" {
		t.Fatalf("expected tool_call_delta type, got %#v", payload["type"])
	}
	if payload["conversation_id"] != "conversation-1" {
		t.Fatalf("expected conversation id, got %#v", payload["conversation_id"])
	}
	if payload["id"] != "call-write" {
		t.Fatalf("expected tool call id, got %#v", payload["id"])
	}
	if payload["name"] != "Write" {
		t.Fatalf("expected tool name, got %#v", payload["name"])
	}
	if payload["seq"] != int64(8) {
		t.Fatalf("expected seq 8, got %#v", payload["seq"])
	}
}

func TestTrimLargeToolContentTruncatesWriteArgs(t *testing.T) {
	longContent := strings.Repeat("x", 500) + "\nline2"
	payload := map[string]any{
		"type": "tool_call",
		"name": "Write",
		"arguments": map[string]any{
			"path":    "src/app.ts",
			"content": longContent,
		},
	}

	TrimLargeToolContent(payload, "tool_call")

	args := payload["arguments"].(map[string]any)
	content := args["content"].(string)
	if len(content) != 200 {
		t.Fatalf("trimmed content length = %d, want 200", len(content))
	}
	meta, ok := args["__liveagent_stream_preview"].(map[string]any)
	if !ok {
		t.Fatalf("expected preview meta, got %#v", args)
	}
	fields := meta["fields"].(map[string]any)
	info := fields["content"].(map[string]any)
	if info["chars"] != len(longContent) || info["truncated"] != true {
		t.Fatalf("preview meta = %#v", info)
	}
}

func TestTrimLargeToolContentTruncatesToolResult(t *testing.T) {
	longText := strings.Repeat("r", 300)
	payload := map[string]any{
		"type":    "tool_result",
		"content": longText,
	}

	TrimLargeToolContent(payload, "tool_result")

	if content := payload["content"].(string); len(content) != 200 {
		t.Fatalf("trimmed result length = %d, want 200", len(content))
	}
	if _, ok := payload["__liveagent_stream_preview"]; !ok {
		t.Fatalf("expected preview meta on tool_result payload")
	}
}
