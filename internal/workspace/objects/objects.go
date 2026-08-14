package objects

type Config struct {
	WorkspacePath string `json:"workspacePath"`
}

type Entry struct {
	Name  string `json:"name"`
	IsDir bool   `json:"isDir"`
}

type ListResult struct {
	Requested string  `json:"requested"`
	Resolved  string  `json:"resolved,omitempty"`
	Entries   []Entry `json:"entries,omitempty"`
	Error     string  `json:"error,omitempty"`
}

type FileResult struct {
	Requested string `json:"requested"`
	Resolved  string `json:"resolved,omitempty"`
	Content   string `json:"content,omitempty"`
	Error     string `json:"error,omitempty"`
}

type MetaResult struct {
	Requested string `json:"requested"`
	Resolved  string `json:"resolved,omitempty"`
	Mtime     int64  `json:"mtime,omitempty"`
	Error     string `json:"error,omitempty"`
}

type SaveResult struct {
	Requested string `json:"requested"`
	Resolved  string `json:"resolved,omitempty"`
	Mtime     int64  `json:"mtime,omitempty"`
	Error     string `json:"error,omitempty"`
}
