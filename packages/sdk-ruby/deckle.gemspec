# frozen_string_literal: true

require_relative "lib/deckle/version"

Gem::Specification.new do |spec|
  spec.name = "deckle"
  spec.version = Deckle::VERSION
  spec.authors = ["Deckle"]
  spec.email = ["support@getdeckle.dev"]

  spec.summary = "Ruby SDK for the Deckle PDF generation API"
  spec.description = "Generate PDFs from HTML, templates, and React components using the Deckle API."
  spec.homepage = "https://getdeckle.dev"
  spec.license = "MIT"
  spec.required_ruby_version = ">= 3.0"

  spec.metadata["homepage_uri"] = spec.homepage
  spec.metadata["source_code_uri"] = "https://github.com/Yoshyaes/deckle"

  spec.files = Dir["lib/**/*.rb", "LICENSE", "README.md"]
  spec.test_files = Dir["spec/**/*.rb"]
  spec.require_paths = ["lib"]

  spec.add_dependency "faraday", "~> 2.0"

  spec.add_development_dependency "rspec", "~> 3.13"
end
