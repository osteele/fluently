require 'rake/packagetask'

PROJECT_NAME = "fluently"
RELEASE_VERSION = open('VERSION').read.chomp
PACKAGE_NAME = "#{PROJECT_NAME}-#{RELEASE_VERSION}.tgz"

IGNORE_FILES = Dir['**/#*#'] + Dir['**/.#*'] + Dir['build/**'] + Dir['working/**'] + Dir['pkg/*'] + %w{build working agenda.txt}
PACKAGE_FILES = Dir['**/*'] - Dir['*.tgz'] - IGNORE_FILES

task :docs => 'build/index.html'

Rake::PackageTask.new("fluently", RELEASE_VERSION) do |p|
  p.need_tar = true
  p.package_files.include PACKAGE_FILES
end

task :publish => [:package, :docs] do
  target = "osteele.com:osteele.com/sources/javascript/fluently"
  sh "rsync -av --delete . #{target} --exclude build"
  sh "scp build/index.html #{target}/index.html"
end

task :clean do
  files = Dir['*.tgz']
  rm files if files.any?
end

task 'build/index.html' => 'README' do |t|
  mkdir_p 'build'
  sh "rdoc --one-file -n build/index.html README"
  url = "http://osteele.com/sources/javascript/fluently/#{PACKAGE_NAME}"
  content = File.read(t.name).
    sub(/<title>.*?<\/title>/, '<title>Fluently</title>').
    sub(/<h2>File:.*?<\/h2>/, '').
    sub(/<h2>Classes<\/h2>/, '').
    sub(/<table.*?<\/table>/m, '').
    sub('{download-location}', "<a href=\"#{url}\">#{url}</a>")
  File.open(t.name, 'w').write(content)
end

SHARED_FILES = %w[fluently.js]

def dirsync(source_dir, target_dir)
  options = {}
  options[:noop] = true if ENV['dryrun']
  SHARED_FILES.each do |fname|
    source = File.expand_path(File.join(source_dir, fname))
    target = File.expand_path(File.join(target_dir, fname))
    copy = false
    case
    when !File.exists?(target)
      copy = true
    when (File.size(source) == File.size(target) and
            File.read(source) == File.read(target))
      copy = false
    when File.mtime(source) < File.mtime(target)
      puts "Skipping #{fname}: source is older than target"
      sh "ls -l {#{source_dir},#{target_dir}}/#{fname}" if ENV['verbose']
    else
      copy = true
    end
    cp source, target, options if copy
  end
end

task :pull do
  dirsync('../lztestkit/src', '.')
end

task :push do
  dirsync('.', '../lztestkit/src')
end
