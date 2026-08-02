package logics

import (
	"testing"
)

func TestIsAllowedFile(t *testing.T) {
	tests := []struct {
		name     string
		resolved string
		want     bool
	}{
		{
			name:     "notes.md",
			resolved: "/path/to/notes.md",
			want:     true,
		},
		{
			name:     "NOTES.MD",
			resolved: "/path/to/NOTES.MD",
			want:     true,
		},
		{
			name:     "guide.markdown",
			resolved: "/path/to/guide.markdown",
			want:     true,
		},
		{
			name:     "README",
			resolved: "/path/to/README",
			want:     true,
		},
		{
			name:     "readme",
			resolved: "/path/to/readme",
			want:     true,
		},
		{
			name:     "README.txt - rejected has extension",
			resolved: "/path/to/README.txt",
			want:     false,
		},
		{
			name:     "LICENSE - rejected no .md extension",
			resolved: "/path/to/LICENSE",
			want:     false,
		},
		{
			name:     "notes.txt",
			resolved: "/path/to/notes.txt",
			want:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsAllowedFile(tt.resolved)
			if got != tt.want {
				t.Errorf("IsAllowedFile(%q) = %v, want %v", tt.resolved, got, tt.want)
			}
		})
	}
}
