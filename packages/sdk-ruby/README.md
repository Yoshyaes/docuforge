# DocuForge Ruby SDK

PDF generation API for developers. HTML in, pixel-perfect PDF out.

## Installation

```bash
gem install docuforge
```

Or in a `Gemfile`:

```ruby
gem "docuforge"
```

## Quick start

```ruby
require "docuforge"

client = DocuForge::Client.new(api_key: ENV["DOCUFORGE_API_KEY"])

pdf = client.generate(html: "<h1>Hello, DocuForge!</h1>")
puts pdf["url"]
```

## Templates

```ruby
template = client.templates.create(
  name: "Invoice",
  html_content: "<h1>Invoice #{{number}}</h1><p>{{amount}}</p>"
)

pdf = client.from_template(
  template: template["id"],
  data: { "number" => 42, "amount" => "$500" }
)
```

## PDF tools

```ruby
# AES-256 password protect a PDF (AES via qpdf server-side)
result = client.pdf_protect(
  pdf: base64_pdf,
  user_password: "open-me",
  permissions: { "print" => "low", "modify" => false }
)

# Cryptographic PAdES signature
client.pdf_sign_annotation(
  pdf: base64_pdf,
  name: "Jane Doe",
  signature: { "p12" => base64_p12, "password" => "p12-pass" }
)
```

## Error handling

```ruby
begin
  client.generate(html: "...")
rescue DocuForge::RateLimitError => e
  puts "rate limited; retry after #{e.retry_after}s"
rescue DocuForge::AuthenticationError => e
  puts "bad API key: #{e.message}"
rescue DocuForge::Error => e
  puts "error #{e.code}: #{e.message}"
end
```

## Development

```bash
bundle install
bundle exec rspec        # run the test suite (Faraday stubbed via Faraday::Adapter::Test)
bundle exec rake test    # same, via Rakefile
```

## License

MIT
